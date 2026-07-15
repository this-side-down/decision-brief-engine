import { describe, expect, it } from "vitest";
import type { DecisionArtifactDiagnostics } from "../../services/generation/decisionArtifactDiagnostics";
import { resolvePromptVariant } from "./runPipelineEval";

function buildDiagnostics(
  overrides: Partial<DecisionArtifactDiagnostics> = {},
): DecisionArtifactDiagnostics {
  return {
    strategy: "split_stage",
    briefRetryCount: 0,
    traceRetryCount: 0,
    briefGenerationLatencyMs: 100,
    traceGenerationLatencyMs: 1,
    markdownAttemptCount: 1,
    markdownRetryReasonCategory: "none",
    markdownGenerationLatencyMs: 100,
    traceConstructionLatencyMs: 1,
    traceConstructionStrategy: "source_bound_projection",
    totalModelCallCount: 1,
    ...overrides,
  };
}

describe("resolvePromptVariant", () => {
  it("labels split-stage Ollama diagnostics as markdown_only_split_stage", () => {
    expect(
      resolvePromptVariant("ollama", buildDiagnostics({ strategy: "split_stage" })),
    ).toBe("markdown_only_split_stage");
  });

  it("labels historical combined Ollama diagnostics as structured_response_combined", () => {
    expect(
      resolvePromptVariant(
        "ollama",
        buildDiagnostics({
          strategy: "combined",
          markdownAttemptCount: null,
          markdownRetryReasonCategory: null,
          markdownGenerationLatencyMs: null,
          traceConstructionLatencyMs: null,
          traceConstructionStrategy: null,
          totalModelCallCount: null,
        }),
      ),
    ).toBe("structured_response_combined");
  });

  it("returns null for non-Ollama modes regardless of diagnostics", () => {
    expect(resolvePromptVariant("mock", buildDiagnostics())).toBeNull();
    expect(resolvePromptVariant("webgpu", buildDiagnostics())).toBeNull();
  });

  it("returns null for Ollama mode when diagnostics were never recorded", () => {
    expect(resolvePromptVariant("ollama", null)).toBeNull();
  });
});
