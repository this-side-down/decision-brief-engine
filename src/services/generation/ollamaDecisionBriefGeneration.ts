import { ollamaGenerate } from "./ollamaClient";
import { buildSourceBoundDecisionTrace } from "./buildSourceBoundDecisionTrace";
import {
  DecisionBriefContractError,
  StageAMarkdownGenerationError,
} from "./decisionBriefContractErrors";
import type {
  DecisionArtifactDiagnostics,
  DecisionArtifactDiagnosticsHolder,
  MarkdownRetryReasonCategory,
  MarkdownAttemptDiagnostic,
} from "./decisionArtifactDiagnostics";
import {
  evaluateDecisionBriefMarkdownOnlyAcceptance,
  formatMarkdownOnlyAcceptanceFindingLines,
  type MarkdownOnlyAcceptanceFailureCategory,
} from "./decisionBriefMarkdownOnlyAcceptance";
import { OLLAMA_STAGE_A_SECTIONS_JSON_SCHEMA } from "./decisionBriefResultSchema";
import { parseDecisionBriefSectionsJson } from "./parseDecisionBriefSections";
import {
  buildDecisionBriefSectionScaffoldPrompt,
} from "./prompts";
import type {
  DecisionBriefResult,
  GenerateDecisionBriefInput,
  GenerateDecisionBriefOptions,
} from "./types";
import { parseDecisionBriefSections } from "../../evaluation/decisionBriefWritingChecks";

/** Stage A allows at most one semantic/parse retry (#154). */
const MAX_MARKDOWN_RETRIES = 1;

/**
 * Non-enumerable property used to attach the Stage A attempt count to a
 * cancellation/timeout/network error before rethrowing it unchanged. These
 * errors are never retried and must keep their original identity (callers
 * elsewhere check `instanceof GenerationCancelledError` and specific
 * messages), so the attempt count travels as a side-channel property rather
 * than by wrapping the error in a different type.
 */
const STAGE_A_ATTEMPT_COUNT_KEY = "stageAAttemptCount";

function attachStageAAttemptCount(error: unknown, attemptCount: number): void {
  if (error && typeof error === "object") {
    Object.defineProperty(error, STAGE_A_ATTEMPT_COUNT_KEY, {
      value: attemptCount,
      enumerable: false,
      configurable: true,
    });
  }
}

function readStageAAttemptCount(error: unknown): number | null {
  if (
    error &&
    typeof error === "object" &&
    STAGE_A_ATTEMPT_COUNT_KEY in error
  ) {
    const value = (error as Record<string, unknown>)[STAGE_A_ATTEMPT_COUNT_KEY];
    return typeof value === "number" ? value : null;
  }
  return null;
}

async function requestMarkdownOnlyDecisionBrief(
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  return ollamaGenerate({
    prompt,
    format: OLLAMA_STAGE_A_SECTIONS_JSON_SCHEMA,
    temperature: 0,
    think: false,
    signal,
  });
}

function recordDecisionArtifactDiagnostics(
  holder: DecisionArtifactDiagnosticsHolder | undefined,
  diagnostics: DecisionArtifactDiagnostics,
): void {
  if (!holder) {
    return;
  }

  holder.value = diagnostics;
}

type StageAMarkdownResult = {
  markdown: string;
  attemptCount: number;
  retryReasonCategory: MarkdownRetryReasonCategory;
  latencyMs: number;
  attempts: MarkdownAttemptDiagnostic[];
};

const SECTION_BODY_FIELDS = [
  ["summary", "Summary"],
  ["decisionContext", "Decision Context"],
  ["optionsConsidered", "Options Considered"],
  ["recommendation", "Recommendation"],
  ["risksAndConstraints", "Risks and Constraints"],
  ["openQuestions", "Open Questions"],
  ["suggestedNextSteps", "Suggested Next Steps"],
  ["confidence", "Confidence"],
] as const;

function extractSectionBodyRecord(markdown: string): Record<string, string> {
  const sections = parseDecisionBriefSections(markdown);
  return Object.fromEntries(
    SECTION_BODY_FIELDS.map(([field, heading]) => [field, sections.get(heading) ?? ""]),
  );
}

/**
 * Stage A: model-generated Markdown only. Reuses the existing markdown_only
 * prompt/schema/parser/acceptance infrastructure (#141). Allows at most one
 * typed retry, using concise validator findings only — never the raw
 * rejected output and never hidden reasoning.
 *
 * Cancellation, timeout, and network/infrastructure failures from
 * ollamaGenerate propagate immediately and are never retried, but the
 * in-flight attempt count is attached to them (see
 * attachStageAAttemptCount) so the caller can still record how many model
 * calls were actually made.
 *
 * A terminal parse/schema or semantic-acceptance failure (after the one
 * allowed retry is exhausted) throws a typed StageAMarkdownGenerationError
 * carrying the attempt count, the retry reason, and elapsed latency, so
 * diagnostics never have to report a false "0 retries" / "1 call" for a
 * Stage A run that actually made two calls.
 */
async function generateStageAMarkdown(
  input: GenerateDecisionBriefInput,
  signal: AbortSignal | undefined,
): Promise<StageAMarkdownResult> {
  const started = Date.now();
  let lastFindingLines: string[] = [];
  let lastRetryReasonCategory: MarkdownOnlyAcceptanceFailureCategory | "parse_or_schema" =
    "required_sections";
  const attemptDiagnostics: MarkdownAttemptDiagnostic[] = [];
  let lastRejectedSectionBodies: Record<string, string> | undefined;

  for (let attempt = 0; attempt <= MAX_MARKDOWN_RETRIES; attempt += 1) {
    const prompt =
      attempt === 0
        ? buildDecisionBriefSectionScaffoldPrompt(input)
        : buildDecisionBriefSectionScaffoldPrompt(
            input,
            lastFindingLines,
            lastRejectedSectionBodies,
          );

    let rawText: string;

    try {
      rawText = await requestMarkdownOnlyDecisionBrief(prompt, signal);
    } catch (networkError) {
      // Cancellation, timeout, and infrastructure/network failures are
      // never retried: they propagate immediately, with the same identity
      // and message the caller already handles, regardless of attempt
      // number. Record how many calls were actually attempted (1-indexed)
      // before rethrowing unchanged.
      attachStageAAttemptCount(networkError, attempt + 1);
      throw networkError;
    }

    let parsed: DecisionBriefResult;

    try {
      parsed = {
        markdown: parseDecisionBriefSectionsJson(rawText, { captureLayer: input.captureLayer }),
        decisionTrace: { entries: [], created_at: "" },
      };
    } catch (parseError) {
      const message =
        parseError instanceof Error
          ? parseError.message
          : "Decision Brief markdown-only result failed to parse.";

      attemptDiagnostics.push({
        attemptNumber: attempt + 1,
        outcome: "parse_or_schema_failure",
        failureCategories: ["parse_or_schema"],
        validatorFindingLines: [message],
        outputLength: rawText.length,
        possibleTruncation: !rawText.trimEnd().endsWith("}"),
      });

      if (attempt >= MAX_MARKDOWN_RETRIES) {
        throw new StageAMarkdownGenerationError({
          message,
          attemptCount: attempt + 1,
          retryReasonCategory: "parse_or_schema",
          markdownLatencyMs: Date.now() - started,
          attemptDiagnostics,
        });
      }

      lastFindingLines = [message];
      lastRetryReasonCategory = "parse_or_schema";
      continue;
    }

    const acceptance = evaluateDecisionBriefMarkdownOnlyAcceptance({
      result: parsed,
      captureLayer: input.captureLayer,
    });

    if (acceptance.accepted) {
      attemptDiagnostics.push({
        attemptNumber: attempt + 1,
        outcome: "accepted",
        failureCategories: [],
        validatorFindingLines: [],
        outputLength: rawText.length,
        possibleTruncation: false,
      });
      return {
        markdown: parsed.markdown,
        attemptCount: attempt + 1,
        retryReasonCategory: attempt === 0 ? "none" : lastRetryReasonCategory,
        latencyMs: Date.now() - started,
        attempts: attemptDiagnostics,
      };
    }

    const findingLines = formatMarkdownOnlyAcceptanceFindingLines(acceptance.detailedFindings);
    attemptDiagnostics.push({
      attemptNumber: attempt + 1,
      outcome: "quality_failure",
      failureCategories: [...acceptance.failureCategories],
      validatorFindingLines: findingLines,
      outputLength: rawText.length,
      possibleTruncation: false,
    });

    if (attempt >= MAX_MARKDOWN_RETRIES) {
      throw new StageAMarkdownGenerationError({
        message: `Decision Brief markdown-only result failed quality validation: ${acceptance.failureCategories.join(", ")}.`,
        attemptCount: attempt + 1,
        retryReasonCategory: lastRetryReasonCategory,
        markdownLatencyMs: Date.now() - started,
        attemptDiagnostics,
      });
    }

    lastFindingLines = findingLines;
    lastRejectedSectionBodies = extractSectionBodyRecord(parsed.markdown);
    lastRetryReasonCategory = acceptance.failureCategories[0] ?? "required_sections";
  }

  // Unreachable: the loop above always returns or throws by the final
  // iteration (attempt === MAX_MARKDOWN_RETRIES).
  throw new DecisionBriefContractError("Decision Brief markdown-only generation failed.");
}

function buildStageAFailureDiagnostics(error: unknown, started: number): DecisionArtifactDiagnostics {
  if (error instanceof StageAMarkdownGenerationError) {
    return {
      strategy: "split_stage",
      briefRetryCount: error.attemptCount - 1,
      traceRetryCount: null,
      briefGenerationLatencyMs: error.markdownLatencyMs,
      traceGenerationLatencyMs: null,
      markdownAttemptCount: error.attemptCount,
      markdownRetryReasonCategory: error.retryReasonCategory,
      markdownGenerationLatencyMs: error.markdownLatencyMs,
      traceConstructionLatencyMs: null,
      traceConstructionStrategy: null,
      totalModelCallCount: error.attemptCount,
      markdownAttempts: error.attemptDiagnostics,
    };
  }

  // Cancellation, timeout, or network/infrastructure failure. The attempt
  // count is whatever was in flight when the error was thrown (attached by
  // generateStageAMarkdown); fall back to 1 if it is somehow missing rather
  // than under-reporting as 0, since at least one call was always attempted.
  const attemptCount = readStageAAttemptCount(error) ?? 1;
  const elapsed = Date.now() - started;

  return {
    strategy: "split_stage",
    briefRetryCount: attemptCount - 1,
    traceRetryCount: null,
    briefGenerationLatencyMs: elapsed,
    traceGenerationLatencyMs: null,
    markdownAttemptCount: attemptCount,
    markdownRetryReasonCategory: null,
    markdownGenerationLatencyMs: elapsed,
    traceConstructionLatencyMs: null,
    traceConstructionStrategy: null,
    totalModelCallCount: attemptCount,
  };
}

/**
 * Split-stage Ollama Decision Brief generation (#154).
 *
 * Stage A generates Markdown only (model call, <=1 retry). Stage B builds the
 * Decision Trace deterministically from the accepted Capture Layer — no
 * model call, so it is never retried; a structurally-unready Capture Layer
 * surfaces as a typed SourceBoundDecisionTraceConstructionError instead of a
 * second unconstrained model call.
 */
export async function generateOllamaDecisionBrief(
  input: GenerateDecisionBriefInput,
  options: GenerateDecisionBriefOptions = {},
): Promise<DecisionBriefResult> {
  const started = Date.now();
  const diagnosticsHolder = options.diagnostics;

  if (diagnosticsHolder) {
    diagnosticsHolder.value = null;
  }

  let stageA: StageAMarkdownResult;

  try {
    stageA = await generateStageAMarkdown(input, options.signal);
  } catch (error) {
    // Terminal contract failure (StageAMarkdownGenerationError) or a
    // cancellation/timeout/network failure — no trace was attempted either
    // way, but the attempt count is now always known, never falsely zero.
    recordDecisionArtifactDiagnostics(diagnosticsHolder, buildStageAFailureDiagnostics(error, started));
    throw error;
  }

  const traceStarted = Date.now();

  try {
    const decisionTrace = buildSourceBoundDecisionTrace(input.captureLayer);
    const traceLatencyMs = Date.now() - traceStarted;

    recordDecisionArtifactDiagnostics(diagnosticsHolder, {
      strategy: "split_stage",
      briefRetryCount: stageA.attemptCount - 1,
      traceRetryCount: 0,
      briefGenerationLatencyMs: stageA.latencyMs,
      traceGenerationLatencyMs: traceLatencyMs,
      markdownAttemptCount: stageA.attemptCount,
      markdownRetryReasonCategory: stageA.retryReasonCategory,
      markdownGenerationLatencyMs: stageA.latencyMs,
      traceConstructionLatencyMs: traceLatencyMs,
      traceConstructionStrategy: "source_bound_projection",
      totalModelCallCount: stageA.attemptCount,
      markdownAttempts: stageA.attempts,
    });

    return { markdown: stageA.markdown, decisionTrace };
  } catch (error) {
    // Includes SourceBoundDecisionTraceConstructionError: a structurally-
    // unready Capture Layer surfaces as a typed contract error here rather
    // than falling back to another model call (#154).
    const traceLatencyMs = Date.now() - traceStarted;

    recordDecisionArtifactDiagnostics(diagnosticsHolder, {
      strategy: "split_stage",
      briefRetryCount: stageA.attemptCount - 1,
      traceRetryCount: 0,
      briefGenerationLatencyMs: stageA.latencyMs,
      traceGenerationLatencyMs: traceLatencyMs,
      markdownAttemptCount: stageA.attemptCount,
      markdownRetryReasonCategory: stageA.retryReasonCategory,
      markdownGenerationLatencyMs: stageA.latencyMs,
      traceConstructionLatencyMs: traceLatencyMs,
      traceConstructionStrategy: "source_bound_projection",
      totalModelCallCount: stageA.attemptCount,
      markdownAttempts: stageA.attempts,
    });

    throw error;
  }
}
