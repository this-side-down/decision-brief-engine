import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import {
  canSelectBrowserInference,
  getGenerationModeBadge,
  getGenerationModeDescription,
  getGenerationModeLabel,
  getGenerationModePreference,
  isOllamaLocked,
  resolveEffectiveMode,
  setGenerationModePreference,
  type UserGenerationModePreference,
} from "../services/generation/generationMode";
import { getModelAdapter } from "../services/generation/getModelAdapter";
import type { ModelAdapter } from "../services/generation/types";
import {
  cancelWebGpuGeneration,
  getLoadedWebGpuEngine,
  isWebGpuModelCached,
  loadWebGpuEngine,
} from "../services/generation/webGpuEngine";
import {
  ModelDownloadFailedError,
  ModelLoadCancelledError,
} from "../services/generation/webGpuErrors";
import {
  runWebGpuPreflight,
  type PreflightResult,
} from "../services/generation/webGpuPreflight";

export type BrowserInferenceUiState =
  | "mock_default"
  | "browser_unsupported"
  | "ready_to_opt_in"
  | "download_disclosure"
  | "downloading_model"
  | "download_cancelled"
  | "download_failed"
  | "model_ready"
  | "generating_capture"
  | "capture_retry"
  | "capture_failed"
  | "generating_brief"
  | "brief_failed"
  | "complete"
  | "fallback_to_mock";

type DownloadProgress = {
  progress: number;
  text: string;
};

export function useGenerationMode() {
  const [modePreference, setModePreferenceState] =
    useState<UserGenerationModePreference>(() => getGenerationModePreference());
  const [preflight, setPreflight] = useState<PreflightResult>({ supported: true });
  const [inferenceUiState, setInferenceUiState] =
    useState<BrowserInferenceUiState>("mock_default");
  const [isDisclosureOpen, setIsDisclosureOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(
    null,
  );
  const [engine, setEngine] = useState<MLCEngineInterface | null>(() =>
    getLoadedWebGpuEngine(),
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  const loadAbortRef = useRef<AbortController | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);

  const effectiveMode = useMemo(
    () => resolveEffectiveMode(modePreference),
    [modePreference],
  );
  const ollamaLocked = isOllamaLocked();
  const modeLabel = getGenerationModeLabel(effectiveMode);
  const modeBadge = getGenerationModeBadge(effectiveMode);
  const modeDescription = getGenerationModeDescription(effectiveMode);
  const isEngineReady = effectiveMode === "webgpu" && engine !== null;

  const refreshPreflight = useCallback(async (requireNetwork = false) => {
    const result = await runWebGpuPreflight({ requireNetwork });
    setPreflight(result);
    return result;
  }, []);

  useEffect(() => {
    void refreshPreflight(false);
  }, [refreshPreflight]);

  useEffect(() => {
    if (ollamaLocked || effectiveMode !== "webgpu") {
      if (effectiveMode === "mock") {
        setInferenceUiState("mock_default");
        setStatusMessage("Using Mock demo. Sample output only—no model download.");
      }
      return;
    }

    if (!preflight.supported) {
      setInferenceUiState("browser_unsupported");
      setStatusMessage(
        "Live in browser is not available here. This browser or device does not support WebGPU inference.",
      );
      return;
    }

    void (async () => {
      const cached = await isWebGpuModelCached();

      if (cached && engine) {
        setInferenceUiState("model_ready");
        setStatusMessage(
          "Live in browser is ready. Generation runs locally on your device.",
        );
        return;
      }

      if (cached) {
        setInferenceUiState("ready_to_opt_in");
        setStatusMessage(
          "Run real generation in your browser. Requires a one-time model download.",
        );
        return;
      }

      setInferenceUiState("ready_to_opt_in");
      setStatusMessage(
        "Run real generation in your browser. Requires a one-time model download.",
      );
    })();
  }, [effectiveMode, engine, ollamaLocked, preflight.supported]);

  const persistPreference = useCallback((preference: UserGenerationModePreference) => {
    setGenerationModePreference(preference);
    setModePreferenceState(preference);
  }, []);

  const selectMockDemo = useCallback(() => {
    loadAbortRef.current?.abort();
    generationAbortRef.current?.abort();
    persistPreference("mock");
    setIsDisclosureOpen(false);
    setDownloadProgress(null);
    setInferenceUiState("fallback_to_mock");
    setStatusMessage("Switched to Mock demo.");
  }, [persistPreference]);

  const cancelModelDownload = useCallback(() => {
    loadAbortRef.current?.abort();
    loadAbortRef.current = null;
    setDownloadProgress(null);
    setIsDisclosureOpen(false);
    setInferenceUiState("download_cancelled");
    setStatusMessage("Model download cancelled. Live in browser is not ready.");
  }, []);

  const confirmModelDownload = useCallback(async () => {
    const result = await refreshPreflight(true);

    if (!result.supported) {
      setInferenceUiState("browser_unsupported");
      setStatusMessage(
        result.reason ??
          "Live in browser is not available here. This browser or device does not support WebGPU inference.",
      );
      setIsDisclosureOpen(false);
      return;
    }

    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    setIsDisclosureOpen(false);
    setInferenceUiState("downloading_model");
    setStatusMessage("Downloading model for live browser generation…");
    setDownloadProgress({ progress: 0, text: "Starting download…" });

    try {
      const loadedEngine = await loadWebGpuEngine({
        signal: controller.signal,
        onProgress: (progress) => {
          setDownloadProgress(progress);
          setStatusMessage(
            `Downloading model for live browser generation… ${Math.round(progress.progress * 100)}%`,
          );
        },
      });

      if (controller.signal.aborted) {
        throw new ModelLoadCancelledError();
      }

      setEngine(loadedEngine);
      setDownloadProgress(null);
      setInferenceUiState("model_ready");
      setStatusMessage(
        "Live in browser is ready. Generation runs locally on your device.",
      );
    } catch (error) {
      setDownloadProgress(null);

      if (error instanceof ModelLoadCancelledError) {
        setInferenceUiState("download_cancelled");
        setStatusMessage("Model download cancelled. Live in browser is not ready.");
        return;
      }

      setInferenceUiState("download_failed");
      setStatusMessage(
        error instanceof ModelDownloadFailedError
          ? error.message
          : "Model download failed. Check your connection and try again.",
      );
    } finally {
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
      }
    }
  }, [refreshPreflight]);

  const selectLiveInBrowser = useCallback(async () => {
    if (!canSelectBrowserInference()) {
      return;
    }

    const result = await refreshPreflight(false);

    if (!result.supported) {
      setInferenceUiState("browser_unsupported");
      setStatusMessage(
        "Live in browser is not available here. This browser or device does not support WebGPU inference.",
      );
      return;
    }

    persistPreference("webgpu");

    if (engine) {
      setInferenceUiState("model_ready");
      setStatusMessage(
        "Live in browser is ready. Generation runs locally on your device.",
      );
      return;
    }

    const cached = await isWebGpuModelCached();

    if (cached) {
      await confirmModelDownload();
      return;
    }

    setInferenceUiState("ready_to_opt_in");
    setStatusMessage(
      "Run real generation in your browser. Requires a one-time model download.",
    );
  }, [confirmModelDownload, engine, persistPreference, refreshPreflight]);

  const openDownloadDisclosure = useCallback(async () => {
    const result = await refreshPreflight(true);

    if (!result.supported) {
      setInferenceUiState("browser_unsupported");
      setStatusMessage(
        result.reason ??
          "Live in browser is not available here. This browser or device does not support WebGPU inference.",
      );
      return;
    }

    persistPreference("webgpu");
    setIsDisclosureOpen(true);
    setInferenceUiState("download_disclosure");
  }, [persistPreference, refreshPreflight]);

  const closeDownloadDisclosure = useCallback(() => {
    setIsDisclosureOpen(false);

    if (engine) {
      setInferenceUiState("model_ready");
      return;
    }

    setInferenceUiState("ready_to_opt_in");
  }, [engine]);

  const retryModelDownload = useCallback(() => {
    void confirmModelDownload();
  }, [confirmModelDownload]);

  const beginGenerationAbort = useCallback(() => {
    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    return controller;
  }, []);

  const endGenerationAbort = useCallback(() => {
    generationAbortRef.current = null;
  }, []);

  const getAdapterForGeneration = useCallback(
    (signal?: AbortSignal, onCaptureRetry?: () => void): ModelAdapter => {
      return getModelAdapter({
        mode: effectiveMode,
        engine,
        signal,
        onCaptureRetry,
      });
    },
    [effectiveMode, engine],
  );

  const notifyCaptureGenerationStarted = useCallback(() => {
    if (effectiveMode !== "webgpu") {
      return;
    }

    setInferenceUiState("generating_capture");
    setStatusMessage("Generating Capture Layer… This may take a minute in your browser.");
  }, [effectiveMode]);

  const notifyCaptureRetry = useCallback(() => {
    if (effectiveMode !== "webgpu") {
      return;
    }

    setInferenceUiState("capture_retry");
    setStatusMessage("Capture Layer JSON was invalid. Retrying once…");
  }, [effectiveMode]);

  const notifyCaptureFailed = useCallback((message: string) => {
    if (effectiveMode !== "webgpu") {
      return;
    }

    setInferenceUiState("capture_failed");
    setStatusMessage(message);
  }, [effectiveMode]);

  const notifyCaptureReady = useCallback(() => {
    if (effectiveMode !== "webgpu") {
      return;
    }

    setInferenceUiState("model_ready");
    setStatusMessage(
      "Live in browser is ready. Generation runs locally on your device.",
    );
  }, [effectiveMode]);

  const notifyBriefGenerationStarted = useCallback(() => {
    if (effectiveMode !== "webgpu") {
      return;
    }

    setInferenceUiState("generating_brief");
    setStatusMessage("Generating Decision Brief from Capture Layer…");
  }, [effectiveMode]);

  const notifyBriefFailed = useCallback((message: string) => {
    if (effectiveMode !== "webgpu") {
      return;
    }

    setInferenceUiState("brief_failed");
    setStatusMessage(message);
  }, [effectiveMode]);

  const notifyGenerationComplete = useCallback(() => {
    if (effectiveMode !== "webgpu") {
      return;
    }

    setInferenceUiState("complete");
    setStatusMessage("Decision Brief ready for review and export.");
  }, [effectiveMode]);

  const cancelActiveGeneration = useCallback(() => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    void cancelWebGpuGeneration(engine);

    if (effectiveMode === "webgpu") {
      setInferenceUiState("model_ready");
      setStatusMessage(
        "Generation cancelled. Live in browser is ready. Generation runs locally on your device.",
      );
    }
  }, [effectiveMode, engine]);

  return {
    effectiveMode,
    modePreference,
    ollamaLocked,
    canSelectBrowserInference: canSelectBrowserInference(),
    modeLabel,
    modeBadge,
    modeDescription,
    preflight,
    inferenceUiState,
    statusMessage,
    downloadProgress,
    isDisclosureOpen,
    isEngineReady,
    engine,
    selectMockDemo,
    selectLiveInBrowser,
    openDownloadDisclosure,
    closeDownloadDisclosure,
    confirmModelDownload,
    cancelModelDownload,
    retryModelDownload,
    fallbackToMockDemo: selectMockDemo,
    getAdapterForGeneration,
    beginGenerationAbort,
    endGenerationAbort,
    cancelActiveGeneration,
    notifyCaptureGenerationStarted,
    notifyCaptureRetry,
    notifyCaptureFailed,
    notifyCaptureReady,
    notifyBriefGenerationStarted,
    notifyBriefFailed,
    notifyGenerationComplete,
    setInferenceUiState,
    setStatusMessage,
  };
}

export type UseGenerationModeResult = ReturnType<typeof useGenerationMode>;
