import { resolveCapturePath } from "./inputBudgetPolicy";
import { normalizeSourceText } from "./normalizeSourceText";
import { segmentSourceText, validateSourceCoverage } from "./segmentSource";
import type { LongInputPlan } from "./types";

export function planLongInput(rawInputText: string): LongInputPlan {
  const trimmed = normalizeSourceText(rawInputText);
  const strategy = resolveCapturePath(trimmed);

  if (strategy === "single_pass") {
    return {
      strategy,
      chunks: [],
      totalSourceLength: trimmed.length,
    };
  }

  const chunks = segmentSourceText(trimmed);
  const coverage = validateSourceCoverage(trimmed, chunks);

  if (!coverage.complete || chunks.length === 0) {
    throw new Error(
      `Long-input planning failed to cover the full source without gaps. gaps=${JSON.stringify(coverage.gaps)} overlaps=${JSON.stringify(coverage.overlaps)}`,
    );
  }

  return {
    strategy,
    chunks,
    totalSourceLength: trimmed.length,
  };
}

export { validateSourceCoverage };
