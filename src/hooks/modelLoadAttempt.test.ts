import { describe, expect, it, vi } from "vitest";
import { ModelDownloadFailedError, ModelLoadCancelledError, ModelLoadTimeoutError } from "../services/generation/webGpuErrors";
import {
  applyModelLoadFailureTransition,
  applyModelLoadProgressUpdate,
  applyModelLoadSuccessTransition,
  createModelDownloadActivitySnapshot,
  createModelLoadAttemptState,
  formatModelDownloadFailureMessage,
  formatModelLoadTimeoutMessage,
  formatDownloadingStatusMessage,
  resolveBrowserInferenceDownloadUi,
  resolveBrowserInferenceStatusMessage,
  sanitizeModelDownloadErrorDetail,
  updateModelDownloadActivitySnapshot,
  type ModelLoadUiSnapshot,
} from "./modelLoadAttempt";

function createUiSnapshot(
  overrides: Partial<ModelLoadUiSnapshot> = {},
): ModelLoadUiSnapshot {
  return {
    engine: null,
    downloadProgress: { progress: 0.25, text: "Fetching shard" },
    lastModelLoadDurationMs: null,
    inferenceUiState: "downloading_model",
    statusMessage: "Downloading model for live browser generation… 25%",
    ...overrides,
  };
}

describe("createModelLoadAttemptState", () => {
  it("accepts progress only for the current unsettled attempt", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();

    expect(state.canAcceptProgress(attemptId, false)).toBe(true);

    expect(state.trySettleAttempt(attemptId)).toBe(true);

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

describe("trySettleAttempt", () => {
  it("lets the current unsettled attempt claim terminal state once", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();

    expect(state.trySettleAttempt(attemptId)).toBe(true);
    expect(state.trySettleAttempt(attemptId)).toBe(false);
  });

  it("rejects a second terminal claim for the same attempt", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();

    expect(state.trySettleAttempt(attemptId)).toBe(true);
    expect(state.trySettleAttempt(attemptId)).toBe(false);
  });

  it("rejects terminal claims from a superseded attempt", () => {
    const state = createModelLoadAttemptState();
    const firstAttemptId = state.beginAttempt();
    state.beginAttempt();

    expect(state.trySettleAttempt(firstAttemptId)).toBe(false);
  });

  it("rejects terminal claims from an invalidated attempt", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();

    state.invalidateCurrentAttempt();

    expect(state.trySettleAttempt(attemptId)).toBe(false);
  });

  it("lets a fresh retry claim terminal state", () => {
    const state = createModelLoadAttemptState();
    const firstAttemptId = state.beginAttempt();
    expect(state.trySettleAttempt(firstAttemptId)).toBe(true);

    const retryAttemptId = state.beginAttempt();
    expect(state.trySettleAttempt(retryAttemptId)).toBe(true);
  });
});

describe("applyModelLoadProgressUpdate", () => {
  it("applies progress for an active attempt", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    const activitySnapshot = createModelDownloadActivitySnapshot(1_000);
    const applyUpdate = vi.fn();

    const applied = applyModelLoadProgressUpdate({
      attemptState: state,
      attemptId,
      aborted: false,
      progress: { progress: 0.42, text: "Fetching shard" },
      activitySnapshot,
      applyUpdate,
    });

    expect(applied).toBe(true);
    expect(applyUpdate).toHaveBeenCalledWith(
      { progress: 0.42, text: "Fetching shard" },
      expect.objectContaining({
        lastProgressValue: 0.42,
        lastPhaseText: "Fetching shard",
      }),
    );
  });

  it("ignores late progress after terminal settlement", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    state.trySettleAttempt(attemptId);
    const applyUpdate = vi.fn();

    expect(
      applyModelLoadProgressUpdate({
        attemptState: state,
        attemptId,
        aborted: false,
        progress: { progress: 0.9, text: "Late callback" },
        activitySnapshot: createModelDownloadActivitySnapshot(1_000),
        applyUpdate,
      }),
    ).toBe(false);
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("ignores late progress after terminal settlement and preserves last-progress timestamp", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    const snapshot = createModelDownloadActivitySnapshot(1_000);
    const updated = updateModelDownloadActivitySnapshot(
      snapshot,
      { progress: 0.2, text: "Fetching shard" },
      2_000,
    );
    state.trySettleAttempt(attemptId);
    const applyUpdate = vi.fn();

    expect(
      applyModelLoadProgressUpdate({
        attemptState: state,
        attemptId,
        aborted: false,
        progress: { progress: 0.9, text: "Late callback" },
        activitySnapshot: updated,
        applyUpdate,
      }),
    ).toBe(false);

    expect(updated.lastProgressAt).toBe(2_000);
  });

  it("allows a fresh retry attempt to report progress normally", () => {
    const state = createModelLoadAttemptState();
    const firstAttemptId = state.beginAttempt();
    state.trySettleAttempt(firstAttemptId);
    const retryAttemptId = state.beginAttempt();
    const applyUpdate = vi.fn();

    expect(
      applyModelLoadProgressUpdate({
        attemptState: state,
        attemptId: firstAttemptId,
        aborted: false,
        progress: { progress: 0.5, text: "Stale" },
        activitySnapshot: createModelDownloadActivitySnapshot(1_000),
        applyUpdate,
      }),
    ).toBe(false);

    expect(
      applyModelLoadProgressUpdate({
        attemptState: state,
        attemptId: retryAttemptId,
        aborted: false,
        progress: { progress: 0.1, text: "Retry started" },
        activitySnapshot: createModelDownloadActivitySnapshot(5_000),
        applyUpdate,
      }),
    ).toBe(true);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("applyModelLoadSuccessTransition", () => {
  it("reaches model_ready for the current attempt", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    const ui = createUiSnapshot();
    const loadedEngine = { id: "engine" };

    expect(
      applyModelLoadSuccessTransition({
        attemptState: state,
        attemptId,
        loadedEngine,
        loadDurationMs: 12_000,
        ui,
      }),
    ).toBe(true);

    expect(ui).toEqual({
      engine: loadedEngine,
      downloadProgress: null,
      lastModelLoadDurationMs: 12_000,
      inferenceUiState: "model_ready",
      statusMessage:
        "Live in browser is ready. Generation runs locally on your device.",
    });
  });

  it("does not apply stale success after supersession", () => {
    const state = createModelLoadAttemptState();
    const attemptA = state.beginAttempt();
    const ui = createUiSnapshot();
    state.beginAttempt();

    expect(
      applyModelLoadSuccessTransition({
        attemptState: state,
        attemptId: attemptA,
        loadedEngine: { id: "stale" },
        loadDurationMs: 9_000,
        ui,
      }),
    ).toBe(false);

    expect(ui.inferenceUiState).toBe("downloading_model");
    expect(ui.engine).toBeNull();
    expect(ui.downloadProgress).not.toBeNull();
  });
});

describe("applyModelLoadFailureTransition", () => {
  it("reaches download_failed for timeout without cancellation copy", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    const ui = createUiSnapshot();
    const onTerminal = vi.fn();

    expect(
      applyModelLoadFailureTransition({
        attemptState: state,
        attemptId,
        error: new ModelLoadTimeoutError(),
        ui,
        onTerminal,
      }),
    ).toBe(true);

    expect(onTerminal).toHaveBeenCalledTimes(1);
    expect(ui.inferenceUiState).toBe("download_failed");
    expect(ui.statusMessage).toBe(formatModelLoadTimeoutMessage());
    expect(ui.statusMessage).not.toContain("cancelled");
  });

  it("reaches download_failed for the current attempt", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    const ui = createUiSnapshot();
    const onTerminal = vi.fn();

    expect(
      applyModelLoadFailureTransition({
        attemptState: state,
        attemptId,
        error: new ModelDownloadFailedError("Failed to load model shard: 403 Forbidden"),
        ui,
        onTerminal,
      }),
    ).toBe(true);

    expect(onTerminal).toHaveBeenCalledTimes(1);
    expect(ui.inferenceUiState).toBe("download_failed");
    expect(ui.downloadProgress).toBeNull();
    expect(ui.statusMessage).toContain("Model download failed.");
  });

  it("does not apply stale failure after supersession", () => {
    const state = createModelLoadAttemptState();
    const attemptA = state.beginAttempt();
    const ui = createUiSnapshot({
      statusMessage: "Downloading model for live browser generation… 50%",
    });
    const onTerminal = vi.fn();
    state.beginAttempt();

    expect(
      applyModelLoadFailureTransition({
        attemptState: state,
        attemptId: attemptA,
        error: new ModelDownloadFailedError("403 Forbidden"),
        ui,
        onTerminal,
      }),
    ).toBe(false);

    expect(onTerminal).not.toHaveBeenCalled();
    expect(ui.inferenceUiState).toBe("downloading_model");
    expect(ui.downloadProgress).not.toBeNull();
  });
});

describe("model load terminal orchestration", () => {
  it("keeps attempt B downloading when attempt A rejects", () => {
    const state = createModelLoadAttemptState();
    const attemptA = state.beginAttempt();
    const ui = createUiSnapshot({
      statusMessage: "Downloading model for live browser generation… 50%",
    });
    const onTerminal = vi.fn();
    const attemptB = state.beginAttempt();

    expect(
      applyModelLoadFailureTransition({
        attemptState: state,
        attemptId: attemptA,
        error: new ModelDownloadFailedError("403 Forbidden"),
        ui,
        onTerminal,
      }),
    ).toBe(false);

    expect(onTerminal).not.toHaveBeenCalled();
    expect(ui.inferenceUiState).toBe("downloading_model");
    expect(state.canAcceptProgress(attemptB, false)).toBe(true);
  });

  it("keeps attempt B authoritative when attempt A resolves", () => {
    const state = createModelLoadAttemptState();
    const attemptA = state.beginAttempt();
    const ui = createUiSnapshot();
    state.beginAttempt();

    expect(
      applyModelLoadSuccessTransition({
        attemptState: state,
        attemptId: attemptA,
        loadedEngine: { id: "stale" },
        loadDurationMs: 4_000,
        ui,
      }),
    ).toBe(false);

    expect(ui.inferenceUiState).toBe("downloading_model");
    expect(ui.engine).toBeNull();
  });

  it("preserves fallback_to_mock when a late rejection arrives after Mock fallback", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    const ui = createUiSnapshot({
      inferenceUiState: "fallback_to_mock",
      statusMessage: "Switched to Mock demo.",
      downloadProgress: null,
    });
    const onTerminal = vi.fn();

    state.invalidateCurrentAttempt();

    expect(
      applyModelLoadFailureTransition({
        attemptState: state,
        attemptId,
        error: new ModelDownloadFailedError("403 Forbidden"),
        ui,
        onTerminal,
      }),
    ).toBe(false);

    expect(onTerminal).not.toHaveBeenCalled();
    expect(ui.inferenceUiState).toBe("fallback_to_mock");
    expect(ui.statusMessage).toBe("Switched to Mock demo.");
  });

  it("preserves download_cancelled when a late rejection arrives after explicit cancel", () => {
    const state = createModelLoadAttemptState();
    const attemptId = state.beginAttempt();
    const ui = createUiSnapshot({
      inferenceUiState: "download_cancelled",
      statusMessage: "Model download cancelled. Live in browser is not ready.",
      downloadProgress: null,
    });
    const onTerminal = vi.fn();

    state.invalidateCurrentAttempt();

    expect(
      applyModelLoadFailureTransition({
        attemptState: state,
        attemptId,
        error: new ModelLoadCancelledError(),
        ui,
        onTerminal,
      }),
    ).toBe(false);

    expect(onTerminal).not.toHaveBeenCalled();
    expect(ui.inferenceUiState).toBe("download_cancelled");
    expect(ui.statusMessage).toBe(
      "Model download cancelled. Live in browser is not ready.",
    );
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

  it("reports timeout with explicit timed-out copy", () => {
    expect(formatModelDownloadFailureMessage(new ModelLoadTimeoutError())).toBe(
      formatModelLoadTimeoutMessage(),
    );
    expect(formatModelLoadTimeoutMessage()).toBe(
      "Model download timed out before the browser model was ready.",
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
