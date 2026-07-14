import { normalizeSourceText } from "./segmentSource";

/**
 * Runtime-agnostic Capture Layer input budget. Keeps ordinary inputs on the
 * single-pass path and reserves space for prompts and structured output without
 * coupling to a specific model context window.
 */
export const CAPTURE_INPUT_BUDGET_POLICY = {
  /** Ordinary inputs at or below this size use single-pass capture. */
  singlePassMaxRawChars: 4500,
  /** Target maximum raw source characters per hierarchical chunk. */
  chunkTargetMaxRawChars: 1800,
  /** Minimum chunk size before accepting a boundary split. */
  chunkMinRawChars: 350,
  /** Conservative reserve for prompt template and brief-type guidance. */
  promptOverheadChars: 1400,
  /** Conservative reserve for structured JSON output in one inference call. */
  structuredOutputReserveChars: 1200,
} as const;

export type CapturePath = "single_pass" | "hierarchical";

export function resolveCapturePath(rawInputText: string): CapturePath {
  const length = normalizeSourceText(rawInputText).length;
  return length > CAPTURE_INPUT_BUDGET_POLICY.singlePassMaxRawChars
    ? "hierarchical"
    : "single_pass";
}

export function effectiveSinglePassRawInputBudget(): number {
  const policy = CAPTURE_INPUT_BUDGET_POLICY;
  return Math.max(
    0,
    policy.singlePassMaxRawChars -
      policy.promptOverheadChars -
      policy.structuredOutputReserveChars,
  );
}

export function effectiveChunkRawInputBudget(): number {
  return CAPTURE_INPUT_BUDGET_POLICY.chunkTargetMaxRawChars;
}
