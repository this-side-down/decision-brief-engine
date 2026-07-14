import type { GenerationMode } from "../generationMode";
import { mockLongInputCaptureCapability } from "./mockChunkExtractor";
import { ollamaLongInputCaptureCapability } from "./ollamaChunkExtractor";
import type { LongInputCaptureCapability } from "./types";

export function getLongInputCaptureCapability(
  mode: GenerationMode,
): LongInputCaptureCapability | null {
  if (mode === "mock") {
    return mockLongInputCaptureCapability;
  }

  if (mode === "ollama") {
    return ollamaLongInputCaptureCapability;
  }

  return null;
}
