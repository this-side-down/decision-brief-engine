import type { InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";
import { getWebGpuConfig } from "./webGpuConfig";
import {
  GenerationCancelledError,
  ModelDownloadFailedError,
  ModelLoadCancelledError,
  ModelLoadTimeoutError,
} from "./webGpuErrors";

export type WebGpuLoadProgress = {
  progress: number;
  text: string;
};

type LoadEngineOptions = {
  onProgress?: (progress: WebGpuLoadProgress) => void;
  signal?: AbortSignal;
};

let cachedEngine: MLCEngineInterface | null = null;
let cachedModelId: string | null = null;
let activeLoadPromise: Promise<MLCEngineInterface> | null = null;

async function importWebLlm() {
  return import("@mlc-ai/web-llm");
}

export async function isWebGpuModelCached(modelId?: string): Promise<boolean> {
  const config = getWebGpuConfig();
  const targetModelId = modelId ?? config.modelId;
  const webllm = await importWebLlm();

  return webllm.hasModelInCache(targetModelId);
}

export function getLoadedWebGpuEngine(): MLCEngineInterface | null {
  return cachedEngine;
}

export async function loadWebGpuEngine(
  options: LoadEngineOptions = {},
): Promise<MLCEngineInterface> {
  const config = getWebGpuConfig();

  if (
    cachedEngine &&
    cachedModelId === config.modelId &&
    !options.signal?.aborted
  ) {
    return cachedEngine;
  }

  if (activeLoadPromise && !options.signal?.aborted) {
    return activeLoadPromise;
  }

  activeLoadPromise = loadWebGpuEngineInternal(config.modelId, config.timeoutMs, options);

  try {
    return await activeLoadPromise;
  } finally {
    activeLoadPromise = null;
  }
}

async function loadWebGpuEngineInternal(
  modelId: string,
  timeoutMs: number,
  options: LoadEngineOptions,
): Promise<MLCEngineInterface> {
  if (options.signal?.aborted) {
    throw new ModelLoadCancelledError();
  }

  const webllm = await importWebLlm();
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
  }, timeoutMs);

  const handleProgress = (report: InitProgressReport) => {
    if (options.signal?.aborted) {
      return;
    }

    options.onProgress?.({
      progress: report.progress,
      text: report.text,
    });
  };

  try {
    const engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: handleProgress,
    });

    if (options.signal?.aborted) {
      await engine.unload().catch(() => undefined);
      throw new ModelLoadCancelledError();
    }

    if (timedOut) {
      await engine.unload().catch(() => undefined);
      throw new ModelLoadTimeoutError();
    }

    cachedEngine = engine;
    cachedModelId = modelId;
    return engine;
  } catch (error) {
    if (options.signal?.aborted || error instanceof ModelLoadCancelledError) {
      throw new ModelLoadCancelledError();
    }

    if (timedOut) {
      throw new ModelLoadTimeoutError();
    }

    if (error instanceof Error && /memory|oom|device lost/i.test(error.message)) {
      throw new ModelDownloadFailedError(
        "This device may not have enough memory for live browser generation.",
      );
    }

    throw new ModelDownloadFailedError(
      error instanceof Error
        ? error.message
        : "Model download failed. Check your connection and try again.",
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function cancelWebGpuGeneration(
  engine: MLCEngineInterface | null,
): Promise<void> {
  if (!engine) {
    return;
  }

  await engine.interruptGenerate();
}

export async function unloadWebGpuEngine(): Promise<void> {
  if (cachedEngine) {
    await cachedEngine.unload().catch(() => undefined);
  }

  cachedEngine = null;
  cachedModelId = null;
  activeLoadPromise = null;
}

export function assertGenerationNotCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new GenerationCancelledError();
  }
}
