import type { BrowserInferenceUiState } from "../../hooks/useGenerationMode";
import { resolveBrowserInferenceDownloadUi } from "../../hooks/modelLoadAttempt";

type BrowserInferenceStatusProps = {
  inferenceUiState: BrowserInferenceUiState;
  statusMessage: string;
  downloadProgress: { progress: number; text: string } | null;
  onCancelDownload?: () => void;
  onRetryDownload?: () => void;
  onStayOnMockDemo?: () => void;
  onUseMockDemo?: () => void;
  onTryAgain?: () => void;
  onCancelGeneration?: () => void;
};

export function BrowserInferenceStatus({
  inferenceUiState,
  statusMessage,
  downloadProgress,
  onCancelDownload,
  onRetryDownload,
  onStayOnMockDemo,
  onUseMockDemo,
  onTryAgain,
  onCancelGeneration,
}: BrowserInferenceStatusProps) {
  const downloadUi = resolveBrowserInferenceDownloadUi(inferenceUiState);
  const showBanner = [
    "browser_unsupported",
    "ready_to_opt_in",
    "downloading_model",
    "download_cancelled",
    "download_failed",
    "model_ready",
    "generating_capture",
    "capture_retry",
    "capture_failed",
    "generating_brief",
    "brief_failed",
    "complete",
    "fallback_to_mock",
  ].includes(inferenceUiState);

  if (!showBanner || !statusMessage) {
    return null;
  }

  const progressValue =
    downloadProgress && downloadProgress.progress >= 0
      ? Math.round(downloadProgress.progress * 100)
      : undefined;

  return (
    <div
      aria-live="polite"
      className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700"
      role="status"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>{statusMessage}</p>
        <div className="flex flex-wrap gap-2">
          {downloadUi.showCancelDownload && onCancelDownload ? (
            <button
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-neutral-950 hover:text-neutral-950"
              onClick={onCancelDownload}
              type="button"
            >
              Cancel download
            </button>
          ) : null}
          {inferenceUiState === "download_cancelled" && onRetryDownload ? (
            <button
              className="rounded border border-neutral-950 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white"
              onClick={onRetryDownload}
              type="button"
            >
              Try again
            </button>
          ) : null}
          {downloadUi.showStayOnMockDemo && onStayOnMockDemo ? (
            <button
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-neutral-950 hover:text-neutral-950"
              onClick={onStayOnMockDemo}
              type="button"
            >
              Stay on Mock demo
            </button>
          ) : null}
          {downloadUi.showRetryDownload && onRetryDownload ? (
            <button
              className="rounded border border-neutral-950 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white"
              onClick={onRetryDownload}
              type="button"
            >
              Retry download
            </button>
          ) : null}
          {(inferenceUiState === "capture_failed" ||
            inferenceUiState === "brief_failed") &&
          onTryAgain ? (
            <button
              className="rounded border border-neutral-950 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white"
              onClick={onTryAgain}
              type="button"
            >
              Try again
            </button>
          ) : null}
          {(inferenceUiState === "capture_failed" ||
            inferenceUiState === "brief_failed") &&
          onUseMockDemo ? (
            <button
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-neutral-950 hover:text-neutral-950"
              onClick={onUseMockDemo}
              type="button"
            >
              Use Mock demo
            </button>
          ) : null}
          {(inferenceUiState === "generating_capture" ||
            inferenceUiState === "capture_retry" ||
            inferenceUiState === "generating_brief") &&
          onCancelGeneration ? (
            <button
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-neutral-950 hover:text-neutral-950"
              onClick={onCancelGeneration}
              type="button"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
      {downloadUi.showProgressBar ? (
        <div className="mt-3">
          <div
            aria-label="Model download progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progressValue}
            className="h-2 overflow-hidden rounded bg-slate-200"
            role="progressbar"
          >
            <div
              className="h-full bg-neutral-950 transition-all"
              style={{
                width:
                  progressValue !== undefined ? `${progressValue}%` : "35%",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {downloadProgress?.text ??
              (progressValue !== undefined
                ? `${progressValue}% complete`
                : "Downloading…")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
