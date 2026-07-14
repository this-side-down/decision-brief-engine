import { describe, expect, it } from "vitest";
import {
  BROWSER_MODEL_DOWNLOAD_SLOW_THRESHOLD_MS,
  BROWSER_MODEL_DOWNLOAD_STALL_THRESHOLD_MS,
  clampDownloadProgress,
  isTrustworthyDownloadProgress,
  resolveBrowserModelDownloadPresentation,
  resolveDownloadActivityState,
} from "./browserModelDownloadPresentation";

const ATTEMPT_STARTED_AT = 1_000_000;

describe("browserModelDownloadPresentation", () => {
  it("uses indeterminate progress when no trustworthy percentage exists", () => {
    const presentation = resolveBrowserModelDownloadPresentation({
      inferenceUiState: "downloading_model",
      downloadProgress: { progress: 0, text: "Start to fetch params" },
      attemptStartedAt: ATTEMPT_STARTED_AT,
      lastProgressAt: ATTEMPT_STARTED_AT,
      now: ATTEMPT_STARTED_AT + 5_000,
    });

    expect(presentation.progressMode).toBe("indeterminate");
    expect(presentation.percentage).toBeNull();
    expect(presentation.showProgressBar).toBe(true);
  });

  it("shows determinate percentage for finite numeric progress", () => {
    const presentation = resolveBrowserModelDownloadPresentation({
      inferenceUiState: "downloading_model",
      downloadProgress: { progress: 0.256, text: "Fetching shard" },
      attemptStartedAt: ATTEMPT_STARTED_AT,
      lastProgressAt: ATTEMPT_STARTED_AT + 1_000,
      now: ATTEMPT_STARTED_AT + 2_000,
    });

    expect(presentation.progressMode).toBe("determinate");
    expect(presentation.percentage).toBe(26);
    expect(presentation.headline).toContain("26%");
  });

  it("clamps progress values into 0 through 1", () => {
    expect(clampDownloadProgress(1.5)).toBe(1);
    expect(clampDownloadProgress(-0.2)).toBe(0);
    expect(isTrustworthyDownloadProgress(0)).toBe(false);
    expect(isTrustworthyDownloadProgress(0.01)).toBe(true);
  });

  it("marks recent callback activity as active", () => {
    expect(
      resolveDownloadActivityState({
        inferenceUiState: "downloading_model",
        attemptStartedAt: ATTEMPT_STARTED_AT,
        lastProgressAt: ATTEMPT_STARTED_AT + 10_000,
        now: ATTEMPT_STARTED_AT + 20_000,
      }),
    ).toBe("active");
  });

  it("marks long-running downloads as slow when still receiving updates", () => {
    expect(
      resolveDownloadActivityState({
        inferenceUiState: "downloading_model",
        attemptStartedAt: ATTEMPT_STARTED_AT,
        lastProgressAt: ATTEMPT_STARTED_AT + 35_000,
        now: ATTEMPT_STARTED_AT + 35_000,
      }),
    ).toBe("slow");
  });

  it("marks downloads as stalled after no recent progress activity", () => {
    expect(
      resolveDownloadActivityState({
        inferenceUiState: "downloading_model",
        attemptStartedAt: ATTEMPT_STARTED_AT,
        lastProgressAt: ATTEMPT_STARTED_AT,
        now: ATTEMPT_STARTED_AT + BROWSER_MODEL_DOWNLOAD_STALL_THRESHOLD_MS,
      }),
    ).toBe("stalled");
    expect(BROWSER_MODEL_DOWNLOAD_SLOW_THRESHOLD_MS).toBe(30_000);
  });

  it("uses slow copy without failing the attempt", () => {
    const presentation = resolveBrowserModelDownloadPresentation({
      inferenceUiState: "downloading_model",
      downloadProgress: { progress: 0, text: "Start to fetch params" },
      attemptStartedAt: ATTEMPT_STARTED_AT,
      lastProgressAt: ATTEMPT_STARTED_AT + 31_000,
      now: ATTEMPT_STARTED_AT + 31_000,
    });

    expect(presentation.activityState).toBe("slow");
    expect(presentation.headline).toBe("Still downloading…");
    expect(presentation.showCancel).toBe(true);
  });

  it("uses stalled copy without failing the attempt", () => {
    const presentation = resolveBrowserModelDownloadPresentation({
      inferenceUiState: "downloading_model",
      downloadProgress: { progress: 0, text: "Start to fetch params" },
      attemptStartedAt: ATTEMPT_STARTED_AT,
      lastProgressAt: ATTEMPT_STARTED_AT,
      now: ATTEMPT_STARTED_AT + BROWSER_MODEL_DOWNLOAD_STALL_THRESHOLD_MS + 1,
    });

    expect(presentation.activityState).toBe("stalled");
    expect(presentation.headline).toBe("Download may be stalled.");
    expect(presentation.showCancel).toBe(true);
  });

  it("hides progress UI for terminal timeout state", () => {
    const presentation = resolveBrowserModelDownloadPresentation({
      inferenceUiState: "download_failed",
      downloadProgress: null,
      attemptStartedAt: null,
      lastProgressAt: null,
      now: ATTEMPT_STARTED_AT + 120_000,
    });

    expect(presentation.activityState).toBe("terminal");
    expect(presentation.showProgressBar).toBe(false);
    expect(presentation.showRetry).toBe(true);
    expect(presentation.showMockFallback).toBe(true);
  });

  it("hides progress UI for terminal cancellation state", () => {
    const presentation = resolveBrowserModelDownloadPresentation({
      inferenceUiState: "download_cancelled",
      downloadProgress: null,
      attemptStartedAt: null,
      lastProgressAt: null,
      now: ATTEMPT_STARTED_AT + 60_000,
    });

    expect(presentation.activityState).toBe("terminal");
    expect(presentation.showProgressBar).toBe(false);
    expect(presentation.showRetry).toBe(true);
  });

  it("hides progress UI for terminal success state", () => {
    const presentation = resolveBrowserModelDownloadPresentation({
      inferenceUiState: "model_ready",
      downloadProgress: null,
      attemptStartedAt: null,
      lastProgressAt: null,
      now: ATTEMPT_STARTED_AT + 60_000,
    });

    expect(presentation.activityState).toBe("terminal");
    expect(presentation.showProgressBar).toBe(false);
  });
});
