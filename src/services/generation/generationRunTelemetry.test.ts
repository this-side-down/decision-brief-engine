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
    });

    expect(lines).toEqual([
      "Runtime: Local Ollama",
      "Capture Layer: 145s",
      "Decision Brief: timed out after 120s",
      "Decision Brief error: Ollama request timed out after 120000ms.",
    ]);
  });

  it("only enables telemetry for real-generation modes", () => {
    expect(shouldShowGenerationTelemetry("mock")).toBe(false);
    expect(shouldShowGenerationTelemetry("ollama")).toBe(true);
    expect(shouldShowGenerationTelemetry("webgpu")).toBe(true);
  });
});
