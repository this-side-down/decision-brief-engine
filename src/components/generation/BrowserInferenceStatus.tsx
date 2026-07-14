import { useEffect, useMemo, useState } from "react";
import type { BrowserInferenceUiState } from "../../hooks/useGenerationMode";
import {
  resolveBrowserInferenceDownloadUi,
  resolveBrowserInferenceStatusMessage,
} from "../../hooks/modelLoadAttempt";
import { resolveBrowserModelDownloadPresentation } from "../../hooks/browserModelDownloadPresentation";

type BrowserInferenceStatusProps = {
  inferenceUiState: BrowserInferenceUiState;
  statusMessage: string;
  downloadProgress: { progress: number; text: string } | null;
  modelLoadAttemptStartedAt?: number | null;
  modelLoadLastCallbackAt?: number | null;
  modelLoadLastMeaningfulProgressAt?: number | null;
  liveModelLoadMessage?: string;
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
  modelLoadAttemptStartedAt = null,
  modelLoadLastCallbackAt = null,
  modelLoadLastMeaningfulProgressAt = null,
  liveModelLoadMessage = "",
  onCancelDownload,
  onRetryDownload,
  onStayOnMockDemo,
  onUseMockDemo,
  onTryAgain,
  onCancelGeneration,
}: BrowserInferenceStatusProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (inferenceUiState !== "downloading_model") {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [inferenceUiState]);

  const downloadPresentation = useMemo(
    () =>
      resolveBrowserModelDownloadPresentation({
        inferenceUiState,
        downloadProgress,
        attemptStartedAt: modelLoadAttemptStartedAt,
        lastCallbackAt: modelLoadLastCallbackAt,
        lastMeaningfulProgressAt: modelLoadLastMeaningfulProgressAt,
        now,
      }),
    [
      downloadProgress,
      inferenceUiState,
      modelLoadAttemptStartedAt,
      modelLoadLastCallbackAt,
      modelLoadLastMeaningfulProgressAt,
      now,
    ],
  );

  const downloadUi = resolveBrowserInferenceDownloadUi(inferenceUiState);
  const isDownloading = inferenceUiState === "downloading_model";
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

  if (!showBanner || (!statusMessage && !isDownloading)) {
    return null;
  }

  const resolvedStatusMessage = resolveBrowserInferenceStatusMessage({
    inferenceUiState,
    statusMessage,
    liveModelLoadMessage,
  });
  const headline = isDownloading
    ? downloadPresentation.headline
    : resolvedStatusMessage;
  const detail = isDownloading ? downloadPresentation.detail : "";
  const showProgressBar = isDownloading && downloadPresentation.showProgressBar;

  return (
    <div
      aria-live="polite"
      className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700"
      role="status"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p>{headline}</p>
          {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {(isDownloading ? downloadPresentation.showCancel : downloadUi.showCancelDownload) &&
          onCancelDownload ? (
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
          {(downloadUi.showStayOnMockDemo || downloadPresentation.showMockFallback) &&
          onStayOnMockDemo ? (
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
              Try again
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
      {showProgressBar ? (
        <div className="mt-3">
          <div
            aria-label="Model download progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={
              downloadPresentation.progressMode === "determinate"
                ? downloadPresentation.percentage ?? undefined
                : undefined
            }
            aria-valuetext={
              downloadPresentation.progressMode === "indeterminate"
                ? "Downloading"
                : undefined
            }
            className="h-2 overflow-hidden rounded bg-slate-200"
            role="progressbar"
          >
            {downloadPresentation.progressMode === "determinate" ? (
              <div
                className="h-full bg-neutral-950 transition-all"
                style={{ width: `${downloadPresentation.percentage ?? 0}%` }}
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-neutral-950/70" />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <p>
              {downloadPresentation.phaseText ??
                (downloadPresentation.progressMode === "determinate"
                  ? `${downloadPresentation.percentage}% complete`
                  : "Preparing download…")}
            </p>
            {downloadPresentation.elapsedLabel ? (
              <p>{downloadPresentation.elapsedLabel}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
