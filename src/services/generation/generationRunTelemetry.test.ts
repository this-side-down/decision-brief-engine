import { describe, expect, it } from "vitest";
import {
  classifyStepOutcome,
  formatBriefStepMessage,
  formatCaptureStepMessage,
  formatElapsedSeconds,
  formatRunDetailsLines,
  formatStepFailureMessage,
  formatTimeoutDurationLabel,
  parseTimeoutMsFromError,
  shouldShowGenerationTelemetry,
} from "./generationRunTelemetry";

describe("generationRunTelemetry", () => {
  it("formats elapsed seconds from milliseconds", () => {
    expect(formatElapsedSeconds(32_500)).toBe("32s");
    expect(formatElapsedSeconds(0)).toBe("0s");
  });

  it("parses timeout duration from Ollama error messages", () => {
    expect(
      parseTimeoutMsFromError("Ollama request timed out after 120000ms."),
    ).toBe(120000);
    expect(parseTimeoutMsFromError("Something else failed.")).toBeNull();
  });

  it("formats capture and brief step messages with elapsed time", () => {
    expect(
      formatCaptureStepMessage({ step: "capture", elapsedMs: 32_000 }),
    ).toBe("Generating Capture Layer… elapsed 32s");
    expect(
      formatCaptureStepMessage({ step: "capture_retry", elapsedMs: 48_000 }),
    ).toBe("Retrying Capture Layer JSON once… elapsed 48s");
    expect(formatBriefStepMessage(72_000)).toBe(
      "Generating Decision Brief… elapsed 72s",
    );
  });

  it("classifies timeout outcomes from error messages", () => {
    expect(
      classifyStepOutcome(new Error("Ollama request timed out after 120000ms.")),
    ).toBe("timeout");
    expect(classifyStepOutcome(null)).toBe("success");
  });

  it("formats timeout failure copy with seconds", () => {
    expect(
      formatStepFailureMessage({
        step: "brief",
        outcome: "timeout",
        errorMessage: "Ollama request timed out after 120000ms.",
      }),
    ).toBe("Decision Brief timed out after 120s");
    expect(
      formatTimeoutDurationLabel("Ollama request timed out after 120000ms."),
    ).toBe("timed out after 120s");
  });

  it("formats run details for mixed success and timeout", () => {
    const lines = formatRunDetailsLines({
      runtimeMode: "ollama",
      runtimeLabel: "Local Ollama",
      modelLoadDurationMs: null,
      captureDurationMs: 145_000,
      captureRetryCount: 0,
      captureOutcome: "success",
      captureError: null,
      briefDurationMs: null,
      briefRetryCount: 0,
      briefOutcome: "timeout",
      briefError: "Ollama request timed out after 120000ms.",
      webGpuEval: null,
    });

    expect(lines).toEqual([
      "Runtime: Local Ollama",
      "Capture Layer: 145s",
      "Decision Brief: timed out after 120s",
      "Decision Brief error: Ollama request timed out after 120000ms.",
    ]);
  });

  it("includes WebGPU structured-output evaluation details when present", () => {
    const lines = formatRunDetailsLines({
      runtimeMode: "webgpu",
      runtimeLabel: "Live in browser",
      modelLoadDurationMs: 30_000,
      captureDurationMs: 45_000,
      captureRetryCount: 1,
      captureOutcome: "success",
      captureError: null,
      briefDurationMs: 20_000,
      briefRetryCount: 1,
      briefOutcome: "error",
      briefError:
        "Browser generation returned an incomplete Decision Brief. Try again or use Mock demo.",
      webGpuEval: {
        modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        webLlmVersion: "0.2.84",
        captureSchemaVersion: "capture-layer-v1",
        briefSchemaVersion: "decision-brief-result-v1",
        captureFirstAttemptSchemaPass: false,
        briefFirstAttemptSchemaPass: true,
        briefFirstAttemptSemanticPass: false,
        briefFirstAttemptPlaceholderLeakage: true,
        briefQualityRetryReasonCategories: ["placeholder_leakage"],
        briefQualityFailureCategories: ["placeholder_leakage"],
        briefFirstAttemptCompletionDiagnostics: {
          promptTokens: 900,
          completionTokens: 300,
          totalTokens: 1200,
          finishReason: "stop",
          configuredMaxTokens: null,
          modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
          webLlmVersion: "0.2.84",
          generationStage: "brief",
          attemptNumber: 1,
        },
        briefFirstAttemptSemanticFindings: {
          missingRequiredSections: [],
          traceReadinessFailures: [],
          alignmentFailures: [],
          writingHardFailures: [],
          placeholderFindings: [
            {
              fieldPath: "markdown",
              category: "markdown_template",
              description: "Template phrase detected",
            },
          ],
          uncoveredRecommendationStatements: [],
          uncoveredNextStepStatements: [],
        },
        briefQualityFailureFindings: null,
        completionDiagnostics: [],
      },
    });

    expect(lines.some((line) => line.includes("Decision Brief first attempt completion:"))).toBe(
      true,
    );
    expect(lines).toContain("WebLLM: 0.2.84 (Qwen2.5-1.5B-Instruct-q4f16_1-MLC)");
    expect(lines).toContain(
      "Structured output schemas: capture-layer-v1 / decision-brief-result-v1",
    );
    expect(lines).toContain("Capture first attempt schema: fail");
    expect(lines).toContain("Decision Brief first attempt schema: pass");
    expect(lines).toContain("Decision Brief first attempt semantic quality: fail");
    expect(lines).toContain("Decision Brief placeholder leakage: detected on first attempt");
    expect(lines).toContain(
      "Decision Brief quality retry reason: placeholder_leakage",
    );
    expect(lines).toContain("Decision Brief quality failure: placeholder_leakage");
    expect(
      lines.some((line) =>
        line.includes(
          "Decision Brief first attempt finding: Placeholder leakage (markdown_template)",
        ),
      ),
    ).toBe(true);
    expect(lines).toContain("Capture Layer: 45s (1 retry)");
    expect(lines).toContain("Decision Brief: failed (1 retry)");
    expect(lines.join("\n")).not.toContain('{"markdown"');
    expect(lines.join("\n")).not.toContain("full markdown brief here");
  });

  it("only enables telemetry for real-generation modes", () => {
    expect(shouldShowGenerationTelemetry("mock")).toBe(false);
    expect(shouldShowGenerationTelemetry("ollama")).toBe(true);
    expect(shouldShowGenerationTelemetry("webgpu")).toBe(true);
  });
});
