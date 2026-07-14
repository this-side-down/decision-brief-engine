export type DecisionArtifactDiagnostics = {
  strategy: "combined" | "split_stage";
  briefRetryCount: number;
  traceRetryCount: number | null;
  briefGenerationLatencyMs: number;
  traceGenerationLatencyMs: number | null;
};

export type DecisionArtifactDiagnosticsHolder = {
  value: DecisionArtifactDiagnostics | null;
};
