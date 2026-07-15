/**
 * Why a Markdown retry (Stage A) was attempted. "none" means the first
 * attempt was accepted. Recorded so evaluation evidence can distinguish
 * contract/parse failures from semantic quality-gate failures.
 */
export type MarkdownRetryReasonCategory =
  | "none"
  | "parse_or_schema"
  | "required_sections"
  | "recommendation_alignment"
  | "next_step_alignment"
  | "writing_hard_failure"
  | "placeholder_leakage";

/**
 * Identifies how the Decision Trace was produced. "source_bound_projection"
 * is the only strategy for split_stage generation: a pure, deterministic
 * projection of the accepted Capture Layer, with no model call involved.
 */
export type TraceConstructionStrategy = "source_bound_projection";

export type DecisionArtifactDiagnostics = {
  strategy: "combined" | "split_stage";
  /**
   * Legacy fields, present for both "combined" and "split_stage" strategies.
   * For "split_stage", briefRetryCount mirrors markdownAttemptCount - 1 and
   * traceRetryCount is always 0 (trace construction is deterministic and is
   * never retried).
   */
  briefRetryCount: number;
  traceRetryCount: number | null;
  briefGenerationLatencyMs: number;
  traceGenerationLatencyMs: number | null;
  /**
   * Split-stage-only fields. Null when strategy is "combined" (including for
   * historical evidence recorded before this field set existed).
   */
  markdownAttemptCount: number | null;
  markdownRetryReasonCategory: MarkdownRetryReasonCategory | null;
  markdownGenerationLatencyMs: number | null;
  traceConstructionLatencyMs: number | null;
  traceConstructionStrategy: TraceConstructionStrategy | null;
  totalModelCallCount: number | null;
};

export type DecisionArtifactDiagnosticsHolder = {
  value: DecisionArtifactDiagnostics | null;
};
