import type { GenerationMode } from "../generationMode";
import { mockLongInputCaptureCapability } from "./mockChunkExtractor";
import type { LongInputCaptureCapability } from "./types";

export function getLongInputCaptureCapability(
  mode: GenerationMode,
): LongInputCaptureCapability | null {
  if (mode === "mock") {
    return mockLongInputCaptureCapability;
  }

  return null;
}
