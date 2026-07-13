import { describe, expect, it, vi } from "vitest";
import { ModelDownloadFailedError, ModelLoadTimeoutError } from "../services/generation/webGpuErrors";
import {
  applyModelLoadProgressUpdate,
  createModelLoadAttemptState,
  formatModelDownloadFailureMessage,
  formatDownloadingStatusMessage,
  resolveBrowserInferenceDownloadUi,
  resolveBrowserInferenceStatusMessage,
  sanitizeModelDownloadErrorDetail,
} from "./modelLoadAttempt";

describe("createModelLoadAttemptState", () => {
  it("accepts progress only for the current unsettled attempt", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();

    expect(state.canAcceptProgress(attemptId, false)).toBe(true);

    state.settleAttempt(attemptId);

    expect(state.canAcceptProgress(attemptId, false)).toBe(false);
  });

  it("rejects progress from a superseded attempt after a fresh retry begins", () => {
    const state = createModelLoadAttemptState();
    const firstAttemptId = state.beginAttempt();
    const secondAttemptId = state.beginAttempt();

    expect(state.canAcceptProgress(firstAttemptId, false)).toBe(false);
    expect(state.canAcceptProgress(secondAttemptId, false)).toBe(true);
  });

  it("rejects progress after invalidation from cancel or mock fallback", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();

    state.invalidateCurrentAttempt();

    expect(state.canAcceptProgress(attemptId, false)).toBe(false);
  });

  it("rejects progress when the controller is aborted", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();

    expect(state.canAcceptProgress(attemptId, true)).toBe(false);
  });
});

describe("applyModelLoadProgressUpdate", () => {
  it("applies progress for an active attempt", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    const applyUpdate = vi.fn();

    const applied = applyModelLoadProgressUpdate({
      attemptState: state,
      attemptId,
      aborted: false,
      progress: { progress: 0.42, text: "Fetching shard" },
      applyUpdate,
    });

    expect(applied).toBe(true);
    expect(applyUpdate).toHaveBeenCalledWith(
      { progress: 0.42, text: "Fetching shard" },
      "Downloading model for live browser generation… 42%",
    );
  });

  it("ignores late progress after failure settlement", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    state.settleAttempt(attemptId);
    const applyUpdate = vi.fn();

    const applied = applyModelLoadProgressUpdate({
      attemptState: state,
      attemptId,
      aborted: false,
      progress: { progress: 0.9, text: "Late callback" },
      applyUpdate,
    });

    expect(applied).toBe(false);
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("ignores late progress after timeout settlement", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    state.settleAttempt(attemptId);
    const applyUpdate = vi.fn();

    expect(
      applyModelLoadProgressUpdate({
        attemptState: state,
        attemptId,
        aborted: false,
        progress: { progress: 0.75, text: "Still downloading?" },
        applyUpdate,
      }),
    ).toBe(false);
  });

  it("ignores late progress after cancellation", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    state.settleAttempt(attemptId);
    const applyUpdate = vi.fn();

    expect(
      applyModelLoadProgressUpdate({
        attemptState: state,
        attemptId,
        aborted: true,
        progress: { progress: 0.2, text: "Cancelled attempt" },
        applyUpdate,
      }),
    ).toBe(false);
  });

  it("allows a fresh retry attempt to report progress normally", () => {
    const state = createModelLoadAttemptState();
    const firstAttemptId = state.beginAttempt();
    state.settleAttempt(firstAttemptId);
    const retryAttemptId = state.beginAttempt();
    const applyUpdate = vi.fn();

    expect(
      applyModelLoadProgressUpdate({
        attemptState: state,
        attemptId: firstAttemptId,
        aborted: false,
        progress: { progress: 0.5, text: "Stale" },
        applyUpdate,
      }),
    ).toBe(false);

    expect(
      applyModelLoadProgressUpdate({
        attemptState: state,
        attemptId: retryAttemptId,
        aborted: false,
        progress: { progress: 0.1, text: "Retry started" },
        applyUpdate,
      }),
    ).toBe(true);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("formatModelDownloadFailureMessage", () => {
  it("prefixes non-cancellation failures with Model download failed.", () => {
    expect(
      formatModelDownloadFailureMessage(
        new ModelDownloadFailedError("Failed to load model shard: 403 Forbidden"),
      ),
    ).toBe("Model download failed. Failed to load model shard: 403 Forbidden");
  });

  it("strips enormous signed URLs from failure copy", () => {
    const message = formatModelDownloadFailureMessage(
      new Error(
        "Failed to load model shard https://cas-bridge.xethub.hf.co/xet-bridge-us/very-long-signed-url 403 Forbidden",
      ),
    );

    expect(message).toBe(
      "Model download failed. Failed to load model shard 403 Forbidden",
    );
    expect(message).not.toContain("https://");
  });

  it("prefixes timeout failures", () => {
    expect(
      formatModelDownloadFailureMessage(new ModelLoadTimeoutError()),
    ).toBe(
      "Model download failed. Model load timed out. Try again on a stable connection.",
    );
  });
});

describe("sanitizeModelDownloadErrorDetail", () => {
  it("preserves readable shard failure text", () => {
    expect(
      sanitizeModelDownloadErrorDetail("Failed to load model shard: 403 Forbidden"),
    ).toBe("Failed to load model shard: 403 Forbidden");
  });
});

describe("resolveBrowserInferenceDownloadUi", () => {
  it("shows cancel download during an active download", () => {
    expect(resolveBrowserInferenceDownloadUi("downloading_model")).toEqual({
      showCancelDownload: true,
      showRetryDownload: false,
      showStayOnMockDemo: false,
      showProgressBar: true,
    });
  });

  it("shows retry and stay-on-mock actions after failure without downloading UI", () => {
    expect(resolveBrowserInferenceDownloadUi("download_failed")).toEqual({
      showCancelDownload: false,
      showRetryDownload: true,
      showStayOnMockDemo: true,
      showProgressBar: false,
    });
  });
});

describe("resolveBrowserInferenceStatusMessage", () => {
  it("uses live model-load elapsed copy only while downloading", () => {
    expect(
      resolveBrowserInferenceStatusMessage({
        inferenceUiState: "downloading_model",
        statusMessage: "Downloading model for live browser generation… 10%",
        liveModelLoadMessage: "Downloading model… elapsed 107s",
      }),
    ).toBe("Downloading model… elapsed 107s");
  });

  it("keeps the terminal failure message after download failure", () => {
    expect(
      resolveBrowserInferenceStatusMessage({
        inferenceUiState: "download_failed",
        statusMessage: "Model download failed. Failed to load model shard: 403 Forbidden",
        liveModelLoadMessage: "Downloading model… elapsed 107s",
      }),
    ).toBe("Model download failed. Failed to load model shard: 403 Forbidden");
  });

  it("does not show downloading copy alongside failed-state actions", () => {
    const resolved = resolveBrowserInferenceStatusMessage({
      inferenceUiState: "download_failed",
      statusMessage: "Model download failed. Failed to load model shard: 403 Forbidden",
      liveModelLoadMessage: "Downloading model… elapsed 107s",
    });
    const ui = resolveBrowserInferenceDownloadUi("download_failed");

    expect(resolved).not.toContain("Downloading model… elapsed");
    expect(ui.showRetryDownload).toBe(true);
    expect(ui.showCancelDownload).toBe(false);
  });
});

describe("formatDownloadingStatusMessage", () => {
  it("formats percent progress for active downloads", () => {
    expect(formatDownloadingStatusMessage(0.256)).toBe(
      "Downloading model for live browser generation… 26%",
    );
  });
});
