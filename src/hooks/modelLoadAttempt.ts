import {
  ModelDownloadFailedError,
  ModelLoadCancelledError,
  ModelLoadTimeoutError,
} from "../services/generation/webGpuErrors";

export type DownloadProgressUpdate = {
  progress: number;
  text: string;
};

export type ModelLoadAttemptState = {
  beginAttempt(): number;
  invalidateCurrentAttempt(): void;
  trySettleAttempt(attemptId: number): boolean;
  canAcceptProgress(attemptId: number, aborted: boolean): boolean;
  isCurrentAttempt(attemptId: number): boolean;
};

export function createModelLoadAttemptState(): ModelLoadAttemptState {
  let currentAttemptId = 0;
  let settled = false;

  return {
    beginAttempt() {
      currentAttemptId += 1;
      settled = false;
      return currentAttemptId;
    },
    invalidateCurrentAttempt() {
      settled = true;
    },
    trySettleAttempt(attemptId) {
      if (attemptId !== currentAttemptId || settled) {
        return false;
      }

      settled = true;
      return true;
    },
    canAcceptProgress(attemptId, aborted) {
      return attemptId === currentAttemptId && !settled && !aborted;
    },
    isCurrentAttempt(attemptId) {
      return attemptId === currentAttemptId;
    },
  };
}

export function formatDownloadingStatusMessage(progress: number): string {
  return `Downloading model for live browser generation… ${Math.round(progress * 100)}%`;
}

export function sanitizeModelDownloadErrorDetail(message: string): string {
  const withoutUrls = message
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const shardMatch = withoutUrls.match(
    /Failed to load model shard[^.]*403 Forbidden/i,
  );
  if (shardMatch) {
    return shardMatch[0].trim();
  }

  if (withoutUrls.length > 200) {
    return `${withoutUrls.slice(0, 197).trim()}...`;
  }

  return withoutUrls;
}

export function formatModelDownloadFailureMessage(error: unknown): string {
  if (error instanceof ModelLoadTimeoutError) {
    const detail = sanitizeModelDownloadErrorDetail(error.message);
    return detail.startsWith("Model download failed")
      ? detail
      : `Model download failed. ${detail}`;
  }

  if (error instanceof ModelDownloadFailedError) {
    const detail = sanitizeModelDownloadErrorDetail(error.message);
    return detail.startsWith("Model download failed")
      ? detail
      : `Model download failed. ${detail}`;
  }

  if (error instanceof Error) {
    const detail = sanitizeModelDownloadErrorDetail(error.message);
    return detail
      ? `Model download failed. ${detail}`
      : "Model download failed. Check your connection and try again.";
  }

  return "Model download failed. Check your connection and try again.";
}

export function isModelLoadCancellation(error: unknown): boolean {
  return error instanceof ModelLoadCancelledError;
}

export type BrowserInferenceDownloadUi = {
  showCancelDownload: boolean;
  showRetryDownload: boolean;
  showStayOnMockDemo: boolean;
  showProgressBar: boolean;
};

export function resolveBrowserInferenceDownloadUi(
  inferenceUiState: string,
): BrowserInferenceDownloadUi {
  const isDownloading = inferenceUiState === "downloading_model";

  return {
    showCancelDownload: isDownloading,
    showRetryDownload: inferenceUiState === "download_failed",
    showStayOnMockDemo: [
      "download_cancelled",
      "download_failed",
      "browser_unsupported",
    ].includes(inferenceUiState),
    showProgressBar: isDownloading,
  };
}

export function resolveBrowserInferenceStatusMessage(options: {
  inferenceUiState: string;
  statusMessage: string;
  liveModelLoadMessage: string;
}): string {
  if (
    options.inferenceUiState === "downloading_model" &&
    options.liveModelLoadMessage
  ) {
    return options.liveModelLoadMessage;
  }

  return options.statusMessage;
}

export function applyModelLoadProgressUpdate(options: {
  attemptState: ModelLoadAttemptState;
  attemptId: number;
  aborted: boolean;
  progress: DownloadProgressUpdate;
  applyUpdate: (progress: DownloadProgressUpdate, statusMessage: string) => void;
}): boolean {
  if (
    !options.attemptState.canAcceptProgress(options.attemptId, options.aborted)
  ) {
    return false;
  }

  options.applyUpdate(
    options.progress,
    formatDownloadingStatusMessage(options.progress.progress),
  );
  return true;
}

export type ModelLoadUiSnapshot = {
  engine: unknown | null;
  downloadProgress: DownloadProgressUpdate | null;
  lastModelLoadDurationMs: number | null;
  inferenceUiState: string;
  statusMessage: string;
};

const MODEL_READY_STATUS =
  "Live in browser is ready. Generation runs locally on your device.";
const DOWNLOAD_CANCELLED_STATUS =
  "Model download cancelled. Live in browser is not ready.";

export function applyModelLoadSuccessTransition(options: {
  attemptState: ModelLoadAttemptState;
  attemptId: number;
  loadedEngine: unknown;
  loadDurationMs: number;
  ui: ModelLoadUiSnapshot;
}): boolean {
  if (!options.attemptState.trySettleAttempt(options.attemptId)) {
    return false;
  }

  options.ui.engine = options.loadedEngine;
  options.ui.downloadProgress = null;
  options.ui.lastModelLoadDurationMs = options.loadDurationMs;
  options.ui.inferenceUiState = "model_ready";
  options.ui.statusMessage = MODEL_READY_STATUS;
  return true;
}

export function applyModelLoadFailureTransition(options: {
  attemptState: ModelLoadAttemptState;
  attemptId: number;
  error: unknown;
  ui: ModelLoadUiSnapshot;
  onTerminal?: () => void;
}): boolean {
  if (!options.attemptState.trySettleAttempt(options.attemptId)) {
    return false;
  }

  options.onTerminal?.();
  options.ui.downloadProgress = null;

  if (isModelLoadCancellation(options.error)) {
    options.ui.inferenceUiState = "download_cancelled";
    options.ui.statusMessage = DOWNLOAD_CANCELLED_STATUS;
    return true;
  }

  options.ui.inferenceUiState = "download_failed";
  options.ui.statusMessage = formatModelDownloadFailureMessage(options.error);
  return true;
}
