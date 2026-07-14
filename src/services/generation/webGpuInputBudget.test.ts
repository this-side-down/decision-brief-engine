import { describe, expect, it } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import { CAPTURE_LAYER_FIELDS } from "./types";
import { buildCaptureLayerPrompt } from "./prompts";
import {
  DEFAULT_WEBGPU_CONTEXT_WINDOW_SIZE,
  estimateTextTokenCount,
  evaluateWebGpuCaptureInputBudget,
  formatWebGpuInputBudgetDiagnostic,
  isWebGpuContextWindowExceededError,
  KNOWN_WEBGPU_CONTEXT_WINDOW_SIZES,
  resolveWebGpuContextWindowSize,
  WEBGPU_CAPTURE_OUTPUT_TOKEN_RESERVE,
  WEBGPU_ESTIMATE_CHARS_PER_TOKEN,
} from "./webGpuInputBudget";

const baseInput = {
  rawInputText: "Short workforce planning notes.",
  briefType: STRATEGY_DECISION_BRIEF,
  briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
  captureLayerFields: [...CAPTURE_LAYER_FIELDS],
};

function buildNearLimitRawInput(): string {
  const budget = evaluateWebGpuCaptureInputBudget({
    ...baseInput,
    rawInputText: "",
  });
  const targetChars = Math.max(
    0,
    budget.maxRawInputTokens * WEBGPU_ESTIMATE_CHARS_PER_TOKEN - 30,
  );

  return "Near limit notes. ".repeat(Math.ceil(targetChars / 18)).slice(0, targetChars);
}

describe("webGpuInputBudget", () => {
  it("uses the known context window override for the default model", () => {
    expect(
      resolveWebGpuContextWindowSize("Qwen2.5-1.5B-Instruct-q4f16_1-MLC"),
    ).toBe(4096);
    expect(
      KNOWN_WEBGPU_CONTEXT_WINDOW_SIZES["Qwen2.5-1.5B-Instruct-q4f16_1-MLC"],
    ).toBe(4096);
  });

  it("falls back to the default context window when no override exists", () => {
    expect(resolveWebGpuContextWindowSize("unknown-model", [])).toBe(
      DEFAULT_WEBGPU_CONTEXT_WINDOW_SIZE,
    );
  });

  it("accepts under-limit input", () => {
    const result = evaluateWebGpuCaptureInputBudget(baseInput);

    expect(result.withinBudget).toBe(true);
    expect(result.estimatedPromptTokens).toBeLessThanOrEqual(result.promptTokenLimit);
    expect(result.countingMethod).toBe("conservative_estimate");
  });

  it("accepts near-limit input just below the budget", () => {
    const rawInputText = buildNearLimitRawInput();
    const result = evaluateWebGpuCaptureInputBudget({
      ...baseInput,
      rawInputText,
    });

    expect(rawInputText.length).toBeGreaterThan(1000);
    expect(result.withinBudget).toBe(true);
    expect(result.estimatedRawInputTokens).toBeLessThanOrEqual(
      result.maxRawInputTokens,
    );
  });

  it("rejects over-limit input such as a long meeting transcript", () => {
    const rawInputText = "Meeting transcript line.\n".repeat(2500);
    const result = evaluateWebGpuCaptureInputBudget({
      ...baseInput,
      rawInputText,
    });

    expect(rawInputText.length).toBeGreaterThan(50_000);
    expect(result.withinBudget).toBe(false);
    expect(result.estimatedPromptTokens).toBeGreaterThan(result.promptTokenLimit);
    expect(formatWebGpuInputBudgetDiagnostic(result)).toContain(
      "estimated_prompt_tokens=",
    );
  });

  it("accounts for fixed Capture Layer prompt overhead", () => {
    const overheadPrompt = buildCaptureLayerPrompt({ ...baseInput, rawInputText: "" });
    const overheadTokens = estimateTextTokenCount(overheadPrompt);
    const result = evaluateWebGpuCaptureInputBudget(baseInput);

    expect(result.estimatedOverheadTokens).toBe(overheadTokens);
    expect(result.promptTokenLimit).toBe(
      result.contextWindowSize - WEBGPU_CAPTURE_OUTPUT_TOKEN_RESERVE,
    );
  });

  it("detects WebLLM context-window runtime errors", () => {
    expect(
      isWebGpuContextWindowExceededError(
        new Error(
          "Prompt tokens exceed context window size: number of prompt tokens: 13904; context window size: 4096",
        ),
      ),
    ).toBe(true);
    expect(
      isWebGpuContextWindowExceededError(new Error("Something else failed.")),
    ).toBe(false);
  });
});
