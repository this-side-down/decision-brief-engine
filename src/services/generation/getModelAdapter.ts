import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import {
  getGenerationModePreference,
  resolveEffectiveMode,
  type GenerationMode,
} from "./generationMode";
import { mockModelAdapter } from "./mockModelAdapter";
import { ollamaModelAdapter } from "./ollamaModelAdapter";
import {
  createWebGpuModelAdapter,
  type WebGpuFirstAttemptResult,
} from "./webGpuModelAdapter";
import type { ModelAdapter } from "./types";

type GetModelAdapterOptions = {
  mode?: GenerationMode;
  engine?: MLCEngineInterface | null;
  signal?: AbortSignal;
  onCaptureRetry?: () => void;
  onBriefRetry?: () => void;
  onCaptureFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
  onBriefFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
};

export function getModelAdapter(options: GetModelAdapterOptions = {}): ModelAdapter {
  const mode = options.mode ?? resolveEffectiveMode(getGenerationModePreference());

  if (mode === "ollama") {
    return ollamaModelAdapter;
  }

  if (mode === "webgpu") {
    if (!options.engine) {
      throw new Error("Live in browser is not ready yet.");
    }

    return createWebGpuModelAdapter({
      engine: options.engine,
      signal: options.signal,
      onCaptureRetry: options.onCaptureRetry,
      onBriefRetry: options.onBriefRetry,
      onCaptureFirstAttempt: options.onCaptureFirstAttempt,
      onBriefFirstAttempt: options.onBriefFirstAttempt,
    });
  }

  return mockModelAdapter;
}
