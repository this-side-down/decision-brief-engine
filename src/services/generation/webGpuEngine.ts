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
let activeLoadEngine: MLCEngineInterface | null = null;
let activeLoadGeneration = 0;

async function importWebLlm() {
  return import("@mlc-ai/web-llm");
}

function isLoadStale(loadGeneration: number): boolean {
  return loadGeneration !== activeLoadGeneration;
}

async function abortInFlightLoadEngine(
  engine: MLCEngineInterface | null,
): Promise<void> {
  if (!engine) {
    return;
  }

  await engine.unload().catch(() => undefined);
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

export async function cancelWebGpuLoad(): Promise<void> {
  activeLoadGeneration += 1;
  const engine = activeLoadEngine;
  activeLoadEngine = null;
  await abortInFlightLoadEngine(engine);
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

  activeLoadPromise = loadWebGpuEngineInternal(
    config.modelId,
    config.timeoutMs,
    options,
  );

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

  activeLoadGeneration += 1;
  const loadGeneration = activeLoadGeneration;
  const previousEngine = activeLoadEngine;
  activeLoadEngine = null;
  await abortInFlightLoadEngine(previousEngine);

  const webllm = await importWebLlm();
  const engine = new webllm.MLCEngine({
    initProgressCallback: (report: InitProgressReport) => {
      if (isLoadStale(loadGeneration) || options.signal?.aborted) {
        return;
      }

      options.onProgress?.({
        progress: report.progress,
        text: report.text,
      });
    },
  });

  activeLoadEngine = engine;

  const handleExternalAbort = () => {
    void cancelWebGpuLoad();
  };

  options.signal?.addEventListener("abort", handleExternalAbort);

  let timeoutId: number | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        void cancelWebGpuLoad();
        reject(new ModelLoadTimeoutError());
      }, timeoutMs);
    });

    const reloadPromise = engine.reload(modelId).then(() => {
      if (isLoadStale(loadGeneration)) {
        throw new ModelLoadCancelledError();
      }

      if (options.signal?.aborted) {
        throw new ModelLoadCancelledError();
      }
    });

    await Promise.race([reloadPromise, timeoutPromise]);

    if (isLoadStale(loadGeneration) || options.signal?.aborted) {
      throw new ModelLoadCancelledError();
    }

    cachedEngine = engine;
    cachedModelId = modelId;
    activeLoadEngine = null;
    return engine;
  } catch (error) {
    if (
      isLoadStale(loadGeneration) ||
      options.signal?.aborted ||
      error instanceof ModelLoadCancelledError ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw new ModelLoadCancelledError();
    }

    if (error instanceof ModelLoadTimeoutError) {
      throw error;
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
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }

    options.signal?.removeEventListener("abort", handleExternalAbort);

    if (activeLoadEngine === engine) {
      activeLoadEngine = null;
    }
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
  await cancelWebGpuLoad();

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
