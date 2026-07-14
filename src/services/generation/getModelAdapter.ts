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
  type WebGpuGenerationCaptureContext,
} from "./webGpuModelAdapter";
import type { StructuredCompletionDiagnostics } from "./browserGenerationDiagnostics";
import type { ModelAdapter } from "./types";

type GetModelAdapterOptions = {
  mode?: GenerationMode;
  engine?: MLCEngineInterface | null;
  signal?: AbortSignal;
  captureContext?: WebGpuGenerationCaptureContext;
  onCaptureRetry?: () => void;
  onBriefRetry?: () => void;
  onCaptureFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
  onBriefFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
  onCompletionDiagnostics?: (
    diagnostics: StructuredCompletionDiagnostics,
  ) => void;
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
      captureContext: options.captureContext,
      onCaptureRetry: options.onCaptureRetry,
      onBriefRetry: options.onBriefRetry,
      onCaptureFirstAttempt: options.onCaptureFirstAttempt,
      onBriefFirstAttempt: options.onBriefFirstAttempt,
      onCompletionDiagnostics: options.onCompletionDiagnostics,
    });
  }

  return mockModelAdapter;
}
