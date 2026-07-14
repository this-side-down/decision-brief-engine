import { describe, expect, it } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import { CAPTURE_LAYER_FIELDS } from "./types";
import { buildCaptureLayerPrompt } from "./prompts";
import {
  canGenerateWebGpuCaptureLayer,
  DEFAULT_WEBGPU_CONTEXT_WINDOW_SIZE,
  estimateApproximateCharacterExcess,
  estimateTextTokenCount,
  evaluateWebGpuCaptureInputBudget,
  formatCharacterCount,
  formatWebGpuInputBudgetDiagnostic,
  formatWebGpuRawInputFeedbackLine,
  isWebGpuCaptureGenerationBlocked,
  isWebGpuContextWindowExceededError,
  KNOWN_WEBGPU_CONTEXT_WINDOW_SIZES,
  resolveWebGpuContextWindowSize,
  resolveWebGpuRawInputFeedback,
  resolveWebGpuRawInputFeedbackThreshold,
  WEBGPU_CAPTURE_OUTPUT_TOKEN_RESERVE,
  WEBGPU_ESTIMATE_CHARS_PER_TOKEN,
  WEBGPU_NEAR_LIMIT_RAW_INPUT_TOKEN_RATIO,
} from "./webGpuInputBudget";

const baseInput = {
  rawInputText: "Short workforce planning notes.",
  briefType: STRATEGY_DECISION_BRIEF,
  briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
  captureLayerFields: [...CAPTURE_LAYER_FIELDS],
};

function buildRawInputAtTokenRatio(ratio: number): string {
  const budget = evaluateWebGpuCaptureInputBudget({
    ...baseInput,
    rawInputText: "",
  });
  const targetTokens = Math.max(
    1,
    Math.floor(budget.maxRawInputTokens * ratio),
  );
  const targetChars = Math.max(
    1,
    targetTokens * WEBGPU_ESTIMATE_CHARS_PER_TOKEN - 40,
  );

  return "Note line. ".repeat(Math.ceil(targetChars / 11)).slice(0, targetChars);
}

function buildJustOverBudgetRawInput(): string {
  let rawInputText = buildRawInputAtTokenRatio(0.95);

  while (
    evaluateWebGpuCaptureInputBudget({
      ...baseInput,
      rawInputText,
    }).withinBudget
  ) {
    rawInputText += "x";
  }

  return rawInputText;
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
    const rawInputText = buildRawInputAtTokenRatio(0.95);
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

describe("webGpu raw input feedback", () => {
  it("shows a normal character count for under-limit input", () => {
    const rawInputText = "5,620 characters worth of notes.".repeat(120);
    const budget = evaluateWebGpuCaptureInputBudget({
      ...baseInput,
      rawInputText,
    });
    const feedback = resolveWebGpuRawInputFeedback(budget, rawInputText);

    expect(feedback.threshold).toBe("normal");
    expect(feedback.displayLine).toBe(
      `${formatCharacterCount(rawInputText.length)} characters`,
    );
    expect(formatWebGpuRawInputFeedbackLine(feedback)).toBe(feedback.displayLine);
    expect(feedback.liveRegionMessage).toBe("");
  });

  it("shows a near-limit warning without a precise character maximum", () => {
    const rawInputText = buildRawInputAtTokenRatio(
      WEBGPU_NEAR_LIMIT_RAW_INPUT_TOKEN_RATIO + 0.02,
    );
    const budget = evaluateWebGpuCaptureInputBudget({
      ...baseInput,
      rawInputText,
    });
    const feedback = resolveWebGpuRawInputFeedback(budget, rawInputText);

    expect(budget.withinBudget).toBe(true);
    expect(resolveWebGpuRawInputFeedbackThreshold(budget)).toBe("near_limit");
    expect(feedback.displayLine).toBe(
      `${formatCharacterCount(rawInputText.length)} characters · nearing browser limit`,
    );
    expect(formatWebGpuRawInputFeedbackLine(feedback)).toBe(
      `Warning: ${feedback.displayLine}`,
    );
    expect(feedback.displayLine).not.toMatch(/\d[\d,]*\s*\/\s*\d/);
  });

  it("shows approximate excess characters when over the browser limit", () => {
    const rawInputText = "Meeting transcript line.\n".repeat(2500);
    const budget = evaluateWebGpuCaptureInputBudget({
      ...baseInput,
      rawInputText,
    });
    const feedback = resolveWebGpuRawInputFeedback(budget, rawInputText);
    const excess = estimateApproximateCharacterExcess(budget);

    expect(feedback.threshold).toBe("over_limit");
    expect(excess).toBeGreaterThan(1000);
    expect(feedback.displayLine).toBe(
      `${formatCharacterCount(rawInputText.length)} characters · about ${formatCharacterCount(excess)} over browser limit`,
    );
    expect(formatWebGpuRawInputFeedbackLine(feedback)).toBe(
      `Error: ${feedback.displayLine}`,
    );
    expect(feedback.displayLine).not.toMatch(/maximum/i);
  });

  it("treats the last within-budget input as acceptable and the next step as blocked", () => {
    const underBudgetText = buildRawInputAtTokenRatio(0.95);
    const overBudgetText = buildJustOverBudgetRawInput();

    expect(
      evaluateWebGpuCaptureInputBudget({
        ...baseInput,
        rawInputText: underBudgetText,
      }).withinBudget,
    ).toBe(true);
    expect(
      evaluateWebGpuCaptureInputBudget({
        ...baseInput,
        rawInputText: overBudgetText,
      }).withinBudget,
    ).toBe(false);
    expect(overBudgetText.length).toBeGreaterThan(underBudgetText.length);
  });
});

describe("webGpu capture generation gating", () => {
  it("allows generation for under-limit browser input", () => {
    const budget = evaluateWebGpuCaptureInputBudget(baseInput);

    expect(
      canGenerateWebGpuCaptureLayer({
        hasRawInput: true,
        hasBriefType: true,
        isWebGpuMode: true,
        budget,
      }),
    ).toBe(true);
    expect(isWebGpuCaptureGenerationBlocked(true, budget)).toBe(false);
  });

  it("blocks only Live in browser when input is over limit", () => {
    const budget = evaluateWebGpuCaptureInputBudget({
      ...baseInput,
      rawInputText: "Meeting transcript line.\n".repeat(2500),
    });

    expect(budget.withinBudget).toBe(false);
    expect(isWebGpuCaptureGenerationBlocked(true, budget)).toBe(true);
    expect(isWebGpuCaptureGenerationBlocked(false, budget)).toBe(false);
    expect(
      canGenerateWebGpuCaptureLayer({
        hasRawInput: true,
        hasBriefType: true,
        isWebGpuMode: false,
        budget,
      }),
    ).toBe(true);
  });

  it("does not apply browser budget gating when generation mode changes away from WebGPU", () => {
    const overBudget = evaluateWebGpuCaptureInputBudget({
      ...baseInput,
      rawInputText: "Meeting transcript line.\n".repeat(2500),
    });

    expect(
      canGenerateWebGpuCaptureLayer({
        hasRawInput: true,
        hasBriefType: true,
        isWebGpuMode: true,
        budget: overBudget,
      }),
    ).toBe(false);
    expect(
      canGenerateWebGpuCaptureLayer({
        hasRawInput: true,
        hasBriefType: true,
        isWebGpuMode: false,
        budget: overBudget,
      }),
    ).toBe(true);
    expect(isWebGpuCaptureGenerationBlocked(false, overBudget)).toBe(false);
  });
});
