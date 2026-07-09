import type { CaptureLayer } from "../types/captureLayer";
import type { DecisionTrace, DecisionTraceEntry } from "../types/decisionTrace";
import {
  DECISION_TRACE_BASIS_ARRAY_FIELDS,
  isGenericWouldChangeIf,
} from "../services/generation/parseDecisionTrace";
import type { StructuralCheck, StructuralReadinessResult } from "./types";

/**
 * Maps each Decision Trace basis field to the Capture Layer field it should be
 * grounded in, per docs/architecture/decision-trace-schema.md "Relationship to
 * the Capture Layer".
 */
const BASIS_FIELD_TO_CAPTURE_LAYER_FIELD = {
  supporting_evidence: "evidence",
  assumptions_relied_on: "assumptions",
  risks_addressed: "risks",
  risks_accepted: "risks",
  constraints_respected: "constraints",
  tradeoffs: "tensions",
  alternatives_considered: "options_considered",
  missing_context_caveats: "missing_context",
} as const satisfies Record<
  (typeof DECISION_TRACE_BASIS_ARRAY_FIELDS)[number],
  keyof CaptureLayer
>;

function check(id: string, pass: boolean, detail: string): StructuralCheck {
  return { id, pass, detail };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * An item is "grounded" when it appears verbatim in the mapped Capture Layer
 * array, or is a substring of (or contains) one of that array's items. This
 * tolerates light paraphrasing while still catching invented content.
 */
function isItemGrounded(item: string, sourceItems: string[]): boolean {
  const normalizedItem = normalize(item);
  if (!normalizedItem) {
    return true;
  }

  return sourceItems.some((sourceItem) => {
    const normalizedSource = normalize(sourceItem);
    return (
      normalizedSource.includes(normalizedItem) ||
      normalizedItem.includes(normalizedSource)
    );
  });
}

function isIntentGrounded(intent: string, captureLayer: CaptureLayer): boolean {
  return isItemGrounded(intent, captureLayer.goals);
}

/**
 * Checks a single entry's basis fields against the corresponding Capture Layer
 * fields. Returns the ungrounded items found, grouped by basis field, so
 * failures are easy to diagnose.
 */
function findUngroundedBasisItems(
  entry: DecisionTraceEntry,
  captureLayer: CaptureLayer,
): string[] {
  const ungrounded: string[] = [];

  for (const basisField of DECISION_TRACE_BASIS_ARRAY_FIELDS) {
    const captureLayerField = BASIS_FIELD_TO_CAPTURE_LAYER_FIELD[basisField];
    const sourceItems = captureLayer[captureLayerField] as string[];
    const items = entry.basis[basisField];

    for (const item of items) {
      if (!isItemGrounded(item, sourceItems)) {
        ungrounded.push(`${basisField}: "${item}"`);
      }
    }
  }

  return ungrounded;
}

function entryHasNonEmptyBasis(entry: DecisionTraceEntry): boolean {
  return DECISION_TRACE_BASIS_ARRAY_FIELDS.some(
    (field) => entry.basis[field].length > 0,
  );
}

function entryHasNonGenericWouldChangeIf(entry: DecisionTraceEntry): boolean {
  return (
    entry.would_change_if.length > 0 &&
    entry.would_change_if.every(
      (condition) => condition.trim().length > 0 && !isGenericWouldChangeIf(condition),
    )
  );
}

/**
 * Automated structural readiness gate for a Decision Trace, mirroring
 * evaluateStructuralReadiness for the Capture Layer. This checks verifiable
 * structure and groundedness signals; it does not score rationale quality.
 *
 * Gate expectations are documented in
 * docs/architecture/decision-trace-schema.md ("Eval gate expectations") and
 * docs/ai/decision-trace-eval-gates.md.
 */
export function evaluateDecisionTraceReadiness(
  captureLayer: CaptureLayer,
  decisionTrace: DecisionTrace,
): StructuralReadinessResult {
  const checks: StructuralCheck[] = [];

  const recommendationEntries = decisionTrace.entries.filter(
    (entry) => entry.kind === "recommendation",
  );
  const nextStepEntries = decisionTrace.entries.filter(
    (entry) => entry.kind === "next_step",
  );

  const hasRecommendationCandidate =
    captureLayer.recommendation_candidate.trim().length > 0;

  checks.push(
    check(
      "recommendation_coverage",
      !hasRecommendationCandidate || recommendationEntries.length >= 1,
      hasRecommendationCandidate
        ? `${recommendationEntries.length} recommendation entr${recommendationEntries.length === 1 ? "y" : "ies"} for a non-empty recommendation_candidate`
        : "recommendation_candidate is empty; recommendation coverage not required",
    ),
  );

  const expectedNextStepCount = captureLayer.suggested_next_steps.length;

  checks.push(
    check(
      "next_step_coverage",
      nextStepEntries.length === expectedNextStepCount,
      `${nextStepEntries.length} next_step entries for ${expectedNextStepCount} suggested_next_steps`,
    ),
  );

  const entriesMissingIntent = decisionTrace.entries.filter(
    (entry) => !entry.basis.intent.trim(),
  );

  checks.push(
    check(
      "entries_have_intent",
      decisionTrace.entries.length === 0 || entriesMissingIntent.length === 0,
      entriesMissingIntent.length === 0
        ? "every entry has a non-empty basis.intent"
        : `${entriesMissingIntent.length} entr${entriesMissingIntent.length === 1 ? "y" : "ies"} missing basis.intent`,
    ),
  );

  const entriesMissingConfidence = decisionTrace.entries.filter(
    (entry) => !["High", "Medium", "Low"].includes(entry.confidence),
  );

  checks.push(
    check(
      "entries_have_confidence",
      entriesMissingConfidence.length === 0,
      entriesMissingConfidence.length === 0
        ? "every entry has a valid per-item confidence"
        : `${entriesMissingConfidence.length} entr${entriesMissingConfidence.length === 1 ? "y" : "ies"} missing valid confidence`,
    ),
  );

  const entriesWithEmptyBasis = decisionTrace.entries.filter(
    (entry) => !entryHasNonEmptyBasis(entry),
  );

  checks.push(
    check(
      "entries_have_non_empty_basis",
      entriesWithEmptyBasis.length === 0,
      entriesWithEmptyBasis.length === 0
        ? "every entry has at least one non-empty basis array field"
        : `${entriesWithEmptyBasis.length} entr${entriesWithEmptyBasis.length === 1 ? "y" : "ies"} with an entirely empty basis`,
    ),
  );

  const entriesWithWeakWouldChangeIf = decisionTrace.entries.filter(
    (entry) => !entryHasNonGenericWouldChangeIf(entry),
  );

  checks.push(
    check(
      "would_change_if_specific",
      entriesWithWeakWouldChangeIf.length === 0,
      entriesWithWeakWouldChangeIf.length === 0
        ? "every entry has at least one specific, non-generic would_change_if condition"
        : `${entriesWithWeakWouldChangeIf.length} entr${entriesWithWeakWouldChangeIf.length === 1 ? "y" : "ies"} with empty or generic would_change_if conditions`,
    ),
  );

  const entriesWithBadIntentGrounding = decisionTrace.entries.filter(
    (entry) => entry.basis.intent.trim() && !isIntentGrounded(entry.basis.intent, captureLayer),
  );

  checks.push(
    check(
      "intent_grounded_in_goals",
      entriesWithBadIntentGrounding.length === 0,
      entriesWithBadIntentGrounding.length === 0
        ? "every non-empty basis.intent is grounded in captureLayer.goals"
        : `${entriesWithBadIntentGrounding.length} entr${entriesWithBadIntentGrounding.length === 1 ? "y" : "ies"} with intent not found in captureLayer.goals`,
    ),
  );

  const ungroundedByEntry = decisionTrace.entries
    .map((entry) => findUngroundedBasisItems(entry, captureLayer))
    .filter((ungrounded) => ungrounded.length > 0);

  checks.push(
    check(
      "basis_grounded_in_capture_layer",
      ungroundedByEntry.length === 0,
      ungroundedByEntry.length === 0
        ? "every basis array item is grounded in the corresponding Capture Layer field"
        : `${ungroundedByEntry.flat().length} basis item(s) not found in the Capture Layer: ${ungroundedByEntry
            .flat()
            .slice(0, 5)
            .join("; ")}`,
    ),
  );

  return {
    pass: checks.every((item) => item.pass),
    checks,
  };
}
