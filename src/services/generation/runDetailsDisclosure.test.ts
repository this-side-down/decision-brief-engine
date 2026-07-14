import { describe, expect, it } from "vitest";
import {
  calculateRunTotalDurationMs,
  createRunDetailsDisclosureState,
  formatRunDetailsCollapsedSummary,
  isGenerationRunFailed,
  isGenerationRunTerminal,
  resolveRunTerminalStatusLabel,
  runDetailsDisclosureReducer,
} from "./runDetailsDisclosure";
import type { GenerationRunRecord } from "./generationRunTelemetry";

function createRunRecord(
  overrides: Partial<GenerationRunRecord> = {},
): GenerationRunRecord {
  return {
    runtimeMode: "webgpu",
    runtimeLabel: "Live in browser",
    modelLoadDurationMs: null,
    captureDurationMs: null,
    captureRetryCount: 0,
    captureOutcome: null,
    captureError: null,
    briefDurationMs: null,
    briefRetryCount: 0,
    briefOutcome: null,
    briefError: null,
    webGpuEval: null,
    ...overrides,
  };
}

describe("runDetailsDisclosureReducer", () => {
  it("defaults successful completed runs to collapsed", () => {
    let state = createRunDetailsDisclosureState();

    state = runDetailsDisclosureReducer(state, {
      type: "run_completed",
      runId: 1,
      failed: false,
    });

    expect(state.expanded).toBe(false);
  });

  it("automatically expands once when a new run ends in failure", () => {
    let state = createRunDetailsDisclosureState();

    state = runDetailsDisclosureReducer(state, {
      type: "run_completed",
      runId: 1,
      failed: true,
    });

    expect(state.expanded).toBe(true);
    expect(state.autoExpandedRunId).toBe(1);
  });

  it("respects manual collapse for the remainder of the current run", () => {
    let state = runDetailsDisclosureReducer(
      {
        expanded: true,
        autoExpandedRunId: 1,
        manuallyCollapsedRunId: null,
      },
      { type: "toggle", runId: 1, expanded: false },
    );

    expect(state.expanded).toBe(false);
    expect(state.manuallyCollapsedRunId).toBe(1);

    state = runDetailsDisclosureReducer(state, {
      type: "run_completed",
      runId: 1,
      failed: true,
    });

    expect(state.expanded).toBe(false);
  });

  it("allows a later failed run to expand again", () => {
    let state = createRunDetailsDisclosureState();

    state = runDetailsDisclosureReducer(state, {
      type: "run_completed",
      runId: 1,
      failed: true,
    });
    state = runDetailsDisclosureReducer(state, {
      type: "toggle",
      runId: 1,
      expanded: false,
    });
    state = runDetailsDisclosureReducer(state, { type: "new_run_started" });
    state = runDetailsDisclosureReducer(state, {
      type: "run_completed",
      runId: 2,
      failed: true,
    });

    expect(state.expanded).toBe(true);
    expect(state.autoExpandedRunId).toBe(2);
    expect(state.manuallyCollapsedRunId).toBeNull();
  });
});

describe("run details collapsed summary", () => {
  it("formats runtime, terminal status, duration, and retry count", () => {
    const summary = formatRunDetailsCollapsedSummary(
      createRunRecord({
        captureDurationMs: 45_000,
        captureRetryCount: 1,
        captureOutcome: "success",
        briefDurationMs: 20_000,
        briefRetryCount: 0,
        briefOutcome: "error",
        briefError: "Browser generation returned an incomplete Decision Brief.",
      }),
    );

    expect(summary).toBe(
      "Live in browser · Decision Brief failed · 65s · 1 retry",
    );
  });

  it("omits duration and retry count when unavailable", () => {
    const summary = formatRunDetailsCollapsedSummary(
      createRunRecord({
        captureOutcome: "success",
      }),
    );

    expect(summary).toBe("Live in browser · Capture Layer succeeded");
  });
});

describe("generation run terminal detection", () => {
  it("identifies failed runs across capture and brief stages", () => {
    expect(
      isGenerationRunFailed(
        createRunRecord({
          captureOutcome: "error",
          captureError: "parse failed",
        }),
      ),
    ).toBe(true);
    expect(
      isGenerationRunFailed(
        createRunRecord({
          captureOutcome: "success",
          briefOutcome: "timeout",
          briefError: "timed out",
        }),
      ),
    ).toBe(true);
    expect(
      isGenerationRunFailed(
        createRunRecord({
          captureOutcome: "success",
          briefOutcome: "success",
        }),
      ),
    ).toBe(false);
  });

  it("treats completed capture as terminal even before brief generation", () => {
    expect(
      isGenerationRunTerminal(
        createRunRecord({
          captureOutcome: "success",
          captureDurationMs: 12_000,
        }),
      ),
    ).toBe(true);
    expect(resolveRunTerminalStatusLabel(createRunRecord({
      captureOutcome: "success",
    }))).toBe("Capture Layer succeeded");
  });

  it("sums available stage durations for the compact summary", () => {
    expect(
      calculateRunTotalDurationMs(
        createRunRecord({
          modelLoadDurationMs: 30_000,
          captureDurationMs: 45_000,
          briefDurationMs: 20_000,
        }),
      ),
    ).toBe(95_000);
  });
});
