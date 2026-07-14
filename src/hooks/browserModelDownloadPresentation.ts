export const BROWSER_MODEL_DOWNLOAD_SLOW_THRESHOLD_MS = 30_000;
export const BROWSER_MODEL_DOWNLOAD_STALL_THRESHOLD_MS = 45_000;

export type DownloadActivityState =
  | "active"
  | "slow"
  | "no_visible_progress_change"
  | "stalled"
  | "terminal";
export type ProgressMode = "determinate" | "indeterminate" | "none";

export type BrowserModelDownloadPresentationInput = {
  inferenceUiState: string;
  downloadProgress: { progress: number; text: string } | null;
  attemptStartedAt: number | null;
  lastCallbackAt: number | null;
  lastMeaningfulProgressAt: number | null;
  now: number;
};

export type BrowserModelDownloadPresentation = {
  progressMode: ProgressMode;
  percentage: number | null;
  activityState: DownloadActivityState;
  headline: string;
  detail: string;
  phaseText: string | null;
  elapsedLabel: string | null;
  showCancel: boolean;
  showRetry: boolean;
  showMockFallback: boolean;
  showProgressBar: boolean;
};

export function clampDownloadProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress));
}

export function isTrustworthyDownloadProgress(
  progress: number | null | undefined,
): boolean {
  return (
    typeof progress === "number" &&
    Number.isFinite(progress) &&
    progress > 0 &&
    progress <= 1
  );
}

export function formatDownloadElapsedLabel(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  return `Elapsed ${seconds}s`;
}

export function resolveDownloadActivityState(options: {
  inferenceUiState: string;
  attemptStartedAt: number | null;
  lastCallbackAt: number | null;
  lastMeaningfulProgressAt: number | null;
  now: number;
}): DownloadActivityState {
  if (
    options.inferenceUiState !== "downloading_model" ||
    options.attemptStartedAt === null
  ) {
    return "terminal";
  }

  const lastCallbackAt = options.lastCallbackAt ?? options.attemptStartedAt;
  const lastMeaningfulProgressAt =
    options.lastMeaningfulProgressAt ?? options.attemptStartedAt;
  const callbackInactiveMs = options.now - lastCallbackAt;
  const meaningfulProgressInactiveMs = options.now - lastMeaningfulProgressAt;
  const elapsedMs = options.now - options.attemptStartedAt;

  if (callbackInactiveMs >= BROWSER_MODEL_DOWNLOAD_STALL_THRESHOLD_MS) {
    return "stalled";
  }

  if (meaningfulProgressInactiveMs >= BROWSER_MODEL_DOWNLOAD_STALL_THRESHOLD_MS) {
    return "no_visible_progress_change";
  }

  if (elapsedMs >= BROWSER_MODEL_DOWNLOAD_SLOW_THRESHOLD_MS) {
    return "slow";
  }

  return "active";
}

export function resolveBrowserModelDownloadPresentation(
  input: BrowserModelDownloadPresentationInput,
): BrowserModelDownloadPresentation {
  const activityState = resolveDownloadActivityState({
    inferenceUiState: input.inferenceUiState,
    attemptStartedAt: input.attemptStartedAt,
    lastCallbackAt: input.lastCallbackAt,
    lastMeaningfulProgressAt: input.lastMeaningfulProgressAt,
    now: input.now,
  });

  if (activityState === "terminal") {
    const isFailure = input.inferenceUiState === "download_failed";
    const isCancelled = input.inferenceUiState === "download_cancelled";

    return {
      progressMode: "none",
      percentage: null,
      activityState,
      headline: "",
      detail: "",
      phaseText: null,
      elapsedLabel: null,
      showCancel: false,
      showRetry: isFailure || isCancelled,
      showMockFallback: ["download_failed", "download_cancelled", "browser_unsupported"].includes(
        input.inferenceUiState,
      ),
      showProgressBar: false,
    };
  }

  const trustworthyProgress = isTrustworthyDownloadProgress(
    input.downloadProgress?.progress,
  );
  const progressMode: ProgressMode = trustworthyProgress
    ? "determinate"
    : "indeterminate";
  const percentage = trustworthyProgress
    ? Math.round(clampDownloadProgress(input.downloadProgress!.progress) * 100)
    : null;
  const phaseText = input.downloadProgress?.text?.trim() || null;
  const elapsedMs =
    input.attemptStartedAt === null ? 0 : input.now - input.attemptStartedAt;
  const elapsedLabel = formatDownloadElapsedLabel(elapsedMs);

  let headline = "Downloading browser model…";
  let detail = "Preparing model files. This may take several minutes.";

  if (activityState === "slow") {
    headline = "Still downloading…";
    detail = "Large model files can take several minutes on the first load.";
  } else if (activityState === "no_visible_progress_change") {
    headline = "Still downloading…";
    detail =
      "No visible progress change has been reported recently. You can keep waiting until timeout or cancel.";
  } else if (activityState === "stalled") {
    headline = "Download may be stalled.";
    detail =
      "No progress update has been received recently. You can keep waiting until timeout, cancel, or try again later.";
  } else if (trustworthyProgress && percentage !== null) {
    headline = `Downloading browser model… ${percentage}%`;
  }

  return {
    progressMode,
    percentage,
    activityState,
    headline,
    detail,
    phaseText,
    elapsedLabel,
    showCancel: true,
    showRetry: false,
    showMockFallback: false,
    showProgressBar: true,
  };
}
