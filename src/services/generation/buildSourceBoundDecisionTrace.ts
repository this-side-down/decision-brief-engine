import type { CaptureLayer } from "../../types/captureLayer";
import type {
  DecisionTrace,
  DecisionTraceBasis,
  DecisionTraceEntry,
  DecisionTraceEntryKind,
} from "../../types/decisionTrace";
import { DECISION_TRACE_BASIS_ARRAY_FIELDS } from "./parseDecisionTrace";

/**
 * Thrown when a structurally-ready Capture Layer still cannot produce a valid
 * Decision Trace deterministically (for example: no goals to select an intent
 * from, or no source-bound text for would_change_if). This is a distinct
 * class from DecisionBriefContractError so callers never mistake a Stage B
 * (deterministic, no model call) failure for a Stage A (model, retryable)
 * failure. Per #154, this must never trigger a second unconstrained model
 * call — it is a contract violation to surface, not a condition to retry.
 */
export class SourceBoundDecisionTraceConstructionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceBoundDecisionTraceConstructionError";
  }
}

type BasisArrayField = (typeof DECISION_TRACE_BASIS_ARRAY_FIELDS)[number];

/**
 * Maps each Decision Trace basis array field to the Capture Layer field it is
 * grounded in. risks_accepted intentionally has no dedicated source: without
 * model judgment there is no deterministic way to distinguish a risk that is
 * "addressed" from one that is merely "accepted", so deterministic
 * construction always leaves risks_accepted empty. All risk-derived grounding
 * is attributed to risks_addressed. This is a deliberate scope decision, not
 * an oversight.
 */
const BASIS_FIELD_TO_CAPTURE_LAYER_FIELD: Partial<
  Record<BasisArrayField, keyof CaptureLayer>
> = {
  supporting_evidence: "evidence",
  assumptions_relied_on: "assumptions",
  risks_addressed: "risks",
  constraints_respected: "constraints",
  tradeoffs: "tensions",
  alternatives_considered: "options_considered",
  missing_context_caveats: "missing_context",
};

/** Fields consulted, in priority order, to construct would_change_if. */
const WOULD_CHANGE_IF_FALLBACK_FIELDS = [
  "open_questions",
  "missing_context",
  "assumptions",
  "risks",
] as const satisfies readonly (keyof CaptureLayer)[];

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "of", "to", "in", "on", "for",
  "with", "is", "are", "was", "were", "be", "been", "being", "this", "that",
  "these", "those", "it", "its", "as", "at", "by", "from", "into", "than",
  "then", "so", "not", "no", "will", "would", "should", "could", "can",
  "may", "might", "must", "we", "our", "their", "they", "which", "who",
  "what", "when", "where", "how", "do", "does", "did", "has", "have", "had",
]);

/**
 * Tokenizes text into a lowercase, punctuation-stripped, stopword-filtered
 * set of words for deterministic lexical overlap scoring. Order-independent
 * by design: this is a relevance signal, not a text-similarity metric.
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOPWORDS.has(token)),
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  let score = 0;
  for (const token of a) {
    if (b.has(token)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Selects the Capture Layer goal most lexically relevant to the entry
 * statement. Ties and zero-overlap cases fall back, deterministically and
 * stably, to the first non-empty goal (never the model, never randomness).
 */
function selectIntent(statement: string, goals: readonly string[]): string {
  const nonEmptyGoals = goals
    .map((goal, index) => ({ goal, index }))
    .filter((candidate) => candidate.goal.trim().length > 0);

  if (nonEmptyGoals.length === 0) {
    throw new SourceBoundDecisionTraceConstructionError(
      "Cannot select a Decision Trace intent: captureLayer.goals has no non-empty entries.",
    );
  }

  const statementTokens = tokenize(statement);
  let best = nonEmptyGoals[0];
  let bestScore = overlapScore(statementTokens, tokenize(best.goal));

  for (const candidate of nonEmptyGoals.slice(1)) {
    const score = overlapScore(statementTokens, tokenize(candidate.goal));
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best.goal;
}

/**
 * Ranks source items in a mapped Capture Layer array by lexical overlap with
 * the entry statement and returns the strongest few (bounded, exact-text-only
 * — never rewritten). Items with zero overlap are excluded; an empty result
 * is acceptable (see module docs: "empty allowed, no filler").
 */
function selectBasisItems(
  statement: string,
  sourceItems: readonly string[],
  cap = 3,
): string[] {
  const statementTokens = tokenize(statement);

  const scored = sourceItems
    .map((item, index) => ({ item, index }))
    .filter((candidate) => candidate.item.trim().length > 0)
    .map((candidate) => ({
      ...candidate,
      score: overlapScore(statementTokens, tokenize(candidate.item)),
    }))
    .filter((candidate) => candidate.score > 0);

  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, cap).map((candidate) => candidate.item);
}

function buildBasis(statement: string, captureLayer: CaptureLayer): DecisionTraceBasis {
  const intent = selectIntent(statement, captureLayer.goals);

  const basis: DecisionTraceBasis = {
    intent,
    supporting_evidence: [],
    assumptions_relied_on: [],
    risks_addressed: [],
    risks_accepted: [],
    constraints_respected: [],
    tradeoffs: [],
    alternatives_considered: [],
    missing_context_caveats: [],
  };

  for (const field of DECISION_TRACE_BASIS_ARRAY_FIELDS) {
    const captureLayerField = BASIS_FIELD_TO_CAPTURE_LAYER_FIELD[field];
    if (!captureLayerField) {
      // risks_accepted: no dedicated source field, see module docs.
      continue;
    }

    const sourceItems = captureLayer[captureLayerField] as string[];
    basis[field] = selectBasisItems(statement, sourceItems);
  }

  const hasNonEmptyBasis = DECISION_TRACE_BASIS_ARRAY_FIELDS.some(
    (field) => basis[field].length > 0,
  );

  if (!hasNonEmptyBasis) {
    throw new SourceBoundDecisionTraceConstructionError(
      `Deterministic trace construction found no grounded basis for statement: "${statement}". ` +
        "No Capture Layer item in any mapped field overlaps lexically with this statement.",
    );
  }

  return basis;
}

/**
 * Builds one specific, source-bound would_change_if condition using the
 * fallback priority: open_questions, then missing_context, then assumptions,
 * then risks. Shared across all entries in a trace (the condition describes
 * what would change the overall decision, not any one statement). Returns
 * grammatically framed but source-exact conditions — never generic ones such
 * as "if circumstances change".
 */
function buildWouldChangeIf(captureLayer: CaptureLayer): string[] {
  const openQuestions = captureLayer.open_questions.filter((q) => q.trim());
  if (openQuestions.length > 0) {
    return openQuestions.map(
      (question) => `If the answer to "${question}" changes the current basis.`,
    );
  }

  const missingContext = captureLayer.missing_context.filter((m) => m.trim());
  if (missingContext.length > 0) {
    return missingContext.map(
      (item) => `If the missing context "${item}" turns out to materially change the facts.`,
    );
  }

  const assumptions = captureLayer.assumptions.filter((a) => a.trim());
  if (assumptions.length > 0) {
    return assumptions.map((assumption) => `If the assumption "${assumption}" is disproven.`);
  }

  const risks = captureLayer.risks.filter((r) => r.trim());
  if (risks.length > 0) {
    return risks.map((risk) => `If the risk "${risk}" materializes.`);
  }

  throw new SourceBoundDecisionTraceConstructionError(
    "Deterministic trace construction found no source text for would_change_if: " +
      "open_questions, missing_context, assumptions, and risks are all empty.",
  );
}

function assertStructurallyReadyForTrace(captureLayer: CaptureLayer): void {
  const emptyStepIndex = captureLayer.suggested_next_steps.findIndex(
    (step) => !step.trim(),
  );

  if (emptyStepIndex !== -1) {
    throw new SourceBoundDecisionTraceConstructionError(
      `captureLayer.suggested_next_steps[${emptyStepIndex}] is empty; deterministic trace ` +
        "construction requires exact, non-empty next-step text.",
    );
  }
}

function buildEntry(
  kind: DecisionTraceEntryKind,
  statement: string,
  captureLayer: CaptureLayer,
  wouldChangeIf: string[],
): DecisionTraceEntry {
  return {
    statement,
    kind,
    basis: buildBasis(statement, captureLayer),
    confidence: captureLayer.confidence,
    would_change_if: wouldChangeIf,
  };
}

export type BuildSourceBoundDecisionTraceOptions = {
  /** Injectable clock so tests can assert deterministic timestamp behavior. */
  now?: () => string;
};

/**
 * Pure, deterministic Decision Trace constructor (Stage B of the split
 * architecture, #154). Never calls a model. Every statement, basis item, and
 * would_change_if condition is copied exactly from the Capture Layer that was
 * already accepted upstream — nothing here is generated free-text, so the
 * result is grounded by construction rather than by post-hoc validation.
 *
 * Throws SourceBoundDecisionTraceConstructionError if the Capture Layer lacks
 * the source material to construct a valid trace (e.g. no goals, no
 * would_change_if source text, or no lexical overlap for some statement's
 * basis). Per #154 this must never trigger a fallback model call.
 */
export function buildSourceBoundDecisionTrace(
  captureLayer: CaptureLayer,
  options: BuildSourceBoundDecisionTraceOptions = {},
): DecisionTrace {
  assertStructurallyReadyForTrace(captureLayer);

  const now = options.now ?? (() => new Date().toISOString());
  const wouldChangeIf = buildWouldChangeIf(captureLayer);
  const entries: DecisionTraceEntry[] = [];

  const recommendationStatement = captureLayer.recommendation_candidate;
  if (recommendationStatement.trim().length > 0) {
    entries.push(buildEntry("recommendation", recommendationStatement, captureLayer, wouldChangeIf));
  }

  for (const step of captureLayer.suggested_next_steps) {
    entries.push(buildEntry("next_step", step, captureLayer, wouldChangeIf));
  }

  return { entries, created_at: now() };
}
