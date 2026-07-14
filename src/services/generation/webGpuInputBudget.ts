import type { GenerateCaptureLayerInput } from "./types";
import { buildCaptureLayerPrompt } from "./prompts";
import { getWebGpuConfig } from "./webGpuConfig";

export const DEFAULT_WEBGPU_CONTEXT_WINDOW_SIZE = 4096;

/** Matches WebLLM prebuiltAppConfig overrides for shipped browser models. */
export const KNOWN_WEBGPU_CONTEXT_WINDOW_SIZES: Readonly<Record<string, number>> = {
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": 4096,
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC": 4096,
  "Llama-3.2-1B-Instruct-q4f16_1-MLC": 4096,
  "SmolLM2-1.7B-Instruct-q4f16_1-MLC": 4096,
};

/**
 * Reserve enough context for structured Capture Layer JSON plus one repair retry.
 * WebLLM validates prompt + max_gen against the context window before inference.
 */
export const WEBGPU_CAPTURE_OUTPUT_TOKEN_RESERVE = 1200;

/**
 * WebLLM 0.2.84 does not expose a public tokenizer/countTokens API on
 * MLCEngineInterface. Use a conservative chars-per-token estimate so browser
 * mode blocks oversized prompts before inference instead of surfacing raw
 * ContextWindowSizeExceededError messages.
 */
export const WEBGPU_ESTIMATE_CHARS_PER_TOKEN = 3;

export type WebGpuTokenCountingMethod = "conservative_estimate";

export type WebGpuRawInputFeedbackThreshold = "normal" | "near_limit" | "over_limit";

export type WebGpuCaptureInputBudgetResult = {
  withinBudget: boolean;
  contextWindowSize: number;
  promptTokenLimit: number;
  estimatedPromptTokens: number;
  estimatedOverheadTokens: number;
  estimatedRawInputTokens: number;
  maxRawInputTokens: number;
  countingMethod: WebGpuTokenCountingMethod;
};

export type WebGpuRawInputFeedback = {
  threshold: WebGpuRawInputFeedbackThreshold;
  characterCount: number;
  formattedCharacterCount: string;
  displayLine: string;
  statusLabel: string;
  liveRegionMessage: string;
  approximateCharacterExcess: number | null;
  withinBudget: boolean;
};

/**
 * Warn when estimated raw-input tokens reach this share of the browser budget.
 * Uses token share rather than a fixed character maximum to avoid false precision.
 */
export const WEBGPU_NEAR_LIMIT_RAW_INPUT_TOKEN_RATIO = 0.85;

export type PrebuiltModelRecord = {
  model_id: string;
  overrides?: {
    context_window_size?: number;
  };
};

export const WEBGPU_INPUT_TOO_LARGE_USER_MESSAGE =
  "Live in browser works best with short-to-medium notes. This input exceeds the browser model limit. Shorten or split your notes, or switch to Local Ollama for longer transcripts.";

export function formatCharacterCount(count: number): string {
  return count.toLocaleString("en-US");
}

export function roundApproximateCharacterCount(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value < 100) {
    return Math.ceil(value / 10) * 10;
  }

  return Math.ceil(value / 100) * 100;
}

export function estimateApproximateCharacterExcess(
  budget: WebGpuCaptureInputBudgetResult,
): number {
  const tokenExcess = Math.max(
    0,
    budget.estimatedRawInputTokens - budget.maxRawInputTokens,
  );

  return roundApproximateCharacterCount(
    tokenExcess * WEBGPU_ESTIMATE_CHARS_PER_TOKEN,
  );
}

export function resolveWebGpuRawInputFeedbackThreshold(
  budget: WebGpuCaptureInputBudgetResult,
): WebGpuRawInputFeedbackThreshold {
  if (!budget.withinBudget) {
    return "over_limit";
  }

  if (
    budget.maxRawInputTokens > 0 &&
    budget.estimatedRawInputTokens >=
      budget.maxRawInputTokens * WEBGPU_NEAR_LIMIT_RAW_INPUT_TOKEN_RATIO
  ) {
    return "near_limit";
  }

  return "normal";
}

export function resolveWebGpuRawInputFeedback(
  budget: WebGpuCaptureInputBudgetResult,
  rawInputText: string,
): WebGpuRawInputFeedback {
  const characterCount = rawInputText.length;
  const formattedCharacterCount = formatCharacterCount(characterCount);
  const threshold = resolveWebGpuRawInputFeedbackThreshold(budget);

  if (threshold === "over_limit") {
    const approximateCharacterExcess = estimateApproximateCharacterExcess(budget);

    return {
      threshold,
      characterCount,
      formattedCharacterCount,
      displayLine: `${formattedCharacterCount} characters · about ${formatCharacterCount(approximateCharacterExcess)} over browser limit`,
      statusLabel: "Error: Input exceeds the browser limit.",
      liveRegionMessage: `Input exceeds the browser limit by about ${formatCharacterCount(approximateCharacterExcess)} characters.`,
      approximateCharacterExcess,
      withinBudget: false,
    };
  }

  if (threshold === "near_limit") {
    return {
      threshold,
      characterCount,
      formattedCharacterCount,
      displayLine: `${formattedCharacterCount} characters · nearing browser limit`,
      statusLabel: "Warning: Input is nearing the browser limit.",
      liveRegionMessage: "Input is nearing the browser limit.",
      approximateCharacterExcess: null,
      withinBudget: true,
    };
  }

  return {
    threshold,
    characterCount,
    formattedCharacterCount,
    displayLine: `${formattedCharacterCount} characters`,
    statusLabel: "Within browser note size.",
    liveRegionMessage: "",
    approximateCharacterExcess: null,
    withinBudget: true,
  };
}

export function formatWebGpuRawInputFeedbackLine(
  feedback: WebGpuRawInputFeedback,
): string {
  if (feedback.threshold === "over_limit") {
    return `Error: ${feedback.displayLine}`;
  }

  if (feedback.threshold === "near_limit") {
    return `Warning: ${feedback.displayLine}`;
  }

  return feedback.displayLine;
}

export function isWebGpuCaptureGenerationBlocked(
  isWebGpuMode: boolean,
  budget: WebGpuCaptureInputBudgetResult | null,
): boolean {
  return isWebGpuMode && budget !== null && !budget.withinBudget;
}

export function canGenerateWebGpuCaptureLayer(options: {
  hasRawInput: boolean;
  hasBriefType: boolean;
  isWebGpuMode: boolean;
  budget: WebGpuCaptureInputBudgetResult | null;
}): boolean {
  if (!options.hasRawInput || !options.hasBriefType) {
    return false;
  }

  if (!options.isWebGpuMode) {
    return true;
  }

  return options.budget?.withinBudget !== false;
}

export function estimateTextTokenCount(text: string): number {
  if (!text) {
    return 0;
  }

  return Math.ceil(text.length / WEBGPU_ESTIMATE_CHARS_PER_TOKEN);
}

export function resolveWebGpuContextWindowSize(
  modelId: string,
  modelList: readonly PrebuiltModelRecord[] = [],
): number {
  const record = modelList.find((item) => item.model_id === modelId);
  const override = record?.overrides?.context_window_size;

  if (typeof override === "number" && override > 0) {
    return override;
  }

  return (
    KNOWN_WEBGPU_CONTEXT_WINDOW_SIZES[modelId] ??
    DEFAULT_WEBGPU_CONTEXT_WINDOW_SIZE
  );
}

export function formatWebGpuInputBudgetDiagnostic(
  result: WebGpuCaptureInputBudgetResult,
): string {
  return [
    "Browser input exceeds context budget.",
    `estimated_prompt_tokens=${result.estimatedPromptTokens}`,
    `prompt_token_limit=${result.promptTokenLimit}`,
    `context_window=${result.contextWindowSize}`,
    `estimated_raw_input_tokens=${result.estimatedRawInputTokens}`,
    `max_raw_input_tokens=${result.maxRawInputTokens}`,
    `counting=${result.countingMethod}`,
  ].join(" ");
}

export function evaluateWebGpuCaptureInputBudget(
  input: GenerateCaptureLayerInput,
  options: {
    modelId?: string;
    modelList?: readonly PrebuiltModelRecord[];
    outputTokenReserve?: number;
  } = {},
): WebGpuCaptureInputBudgetResult {
  const { modelId = getWebGpuConfig().modelId } = options;
  const outputTokenReserve =
    options.outputTokenReserve ?? WEBGPU_CAPTURE_OUTPUT_TOKEN_RESERVE;
  const contextWindowSize = resolveWebGpuContextWindowSize(
    modelId,
    options.modelList,
  );
  const promptTokenLimit = Math.max(
    0,
    contextWindowSize - outputTokenReserve,
  );

  const fullPrompt = buildCaptureLayerPrompt(input);
  const overheadPrompt = buildCaptureLayerPrompt({
    ...input,
    rawInputText: "",
  });
  const estimatedPromptTokens = estimateTextTokenCount(fullPrompt);
  const estimatedOverheadTokens = estimateTextTokenCount(overheadPrompt);
  const estimatedRawInputTokens = estimateTextTokenCount(input.rawInputText);
  const maxRawInputTokens = Math.max(
    0,
    promptTokenLimit - estimatedOverheadTokens,
  );

  return {
    withinBudget: estimatedPromptTokens <= promptTokenLimit,
    contextWindowSize,
    promptTokenLimit,
    estimatedPromptTokens,
    estimatedOverheadTokens,
    estimatedRawInputTokens,
    maxRawInputTokens,
    countingMethod: "conservative_estimate",
  };
}

export function isWebGpuContextWindowExceededError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "ContextWindowSizeExceededError" ||
    /prompt tokens exceed context window size|context window size:/i.test(
      error.message,
    )
  );
}
