import type { MarkdownAttemptDiagnostic } from "./decisionArtifactDiagnostics";

export class DecisionBriefContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionBriefContractError";
  }
}

/**
 * Thrown when Ollama split-stage Stage A (Markdown generation) terminates
 * without an accepted result, after using at most its one allowed retry.
 *
 * This extends DecisionBriefContractError so existing `instanceof
 * DecisionBriefContractError` checks (including pre-existing tests) keep
 * working unchanged. It additionally carries the attempt/retry metadata that
 * generateOllamaDecisionBrief needs to record accurate request-scoped
 * diagnostics — previously this metadata was dropped on terminal failure,
 * making it look as though only one model call had ever been made.
 *
 * `retryReasonCategory` records why the FIRST failing attempt triggered a
 * retry (the retry's cause), not necessarily the category of the final
 * attempt's failure if it differs. That keeps the field's meaning consistent
 * with the successful-after-retry case, where it already recorded the same
 * thing.
 */
export class StageAMarkdownGenerationError extends DecisionBriefContractError {
  readonly attemptCount: number;
  readonly retryReasonCategory:
    | "parse_or_schema"
    | "required_sections"
    | "recommendation_alignment"
    | "next_step_alignment"
    | "writing_hard_failure"
    | "placeholder_leakage";
  readonly markdownLatencyMs: number;
  readonly attemptDiagnostics: MarkdownAttemptDiagnostic[];

  constructor(options: {
    message: string;
    attemptCount: number;
    retryReasonCategory: StageAMarkdownGenerationError["retryReasonCategory"];
    markdownLatencyMs: number;
    attemptDiagnostics: MarkdownAttemptDiagnostic[];
  }) {
    super(options.message);
    this.name = "StageAMarkdownGenerationError";
    this.attemptCount = options.attemptCount;
    this.retryReasonCategory = options.retryReasonCategory;
    this.markdownLatencyMs = options.markdownLatencyMs;
    this.attemptDiagnostics = options.attemptDiagnostics;
  }
}
