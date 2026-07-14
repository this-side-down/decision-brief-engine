import { describe, expect, it } from "vitest";
import {
  applyRunRecordTransition,
  calculateRunTotalDurationMs,
  createRunDetailsDisclosureState,
  createStageCompletionSnapshot,
  formatRunDetailsCollapsedSummary,
  isGenerationRunFailed,
  isStageFailed,
  resolveRunTerminalStatusLabel,
  runDetailsDisclosureReducer,
  stageFailureKey,
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

function simulateTelemetryRun(options: {
  runId: number;
  records: GenerationRunRecord[];
}): ReturnType<typeof createRunDetailsDisclosureState> {
  let state = createRunDetailsDisclosureState();
  let snapshot = createStageCompletionSnapshot();

  for (const record of options.records) {
    const transition = applyRunRecordTransition({
      state,
      previousSnapshot: snapshot,
      runId: options.runId,
      record,
    });
    state = transition.state;
    snapshot = transition.snapshot;
  }

  return state;
}

describe("runDetailsDisclosureReducer", () => {
  it("defaults successful stage completion to collapsed", () => {
    let state = createRunDetailsDisclosureState();

    state = runDetailsDisclosureReducer(state, {
      type: "stage_completed",
      runId: 1,
      stage: "capture",
      failed: false,
    });

    expect(state.expanded).toBe(false);
  });

  it("automatically expands once when a stage completes in failure", () => {
    let state = createRunDetailsDisclosureState();

    state = runDetailsDisclosureReducer(state, {
      type: "stage_completed",
      runId: 1,
      stage: "brief",
      failed: true,
    });

    expect(state.expanded).toBe(true);
    expect(state.autoExpandedFailureKeys).toEqual([stageFailureKey(1, "brief")]);
  });

  it("respects manual collapse for the remainder of the current run", () => {
    let state = runDetailsDisclosureReducer(
      {
        expanded: true,
        autoExpandedFailureKeys: [stageFailureKey(1, "brief")],
        manuallyCollapsedRunId: null,
      },
      { type: "toggle", runId: 1, expanded: false },
    );

    expect(state.expanded).toBe(false);
    expect(state.manuallyCollapsedRunId).toBe(1);

    state = runDetailsDisclosureReducer(state, {
      type: "stage_completed",
      runId: 1,
      stage: "brief",
      failed: true,
    });

    expect(state.expanded).toBe(false);
  });

  it("allows a later failed run to expand again", () => {
    let state = createRunDetailsDisclosureState();

    state = runDetailsDisclosureReducer(state, {
      type: "stage_completed",
      runId: 1,
      stage: "capture",
      failed: true,
    });
    state = runDetailsDisclosureReducer(state, {
      type: "toggle",
      runId: 1,
      expanded: false,
    });
    state = runDetailsDisclosureReducer(state, { type: "new_run_started" });
    state = runDetailsDisclosureReducer(state, {
      type: "stage_completed",
      runId: 2,
      stage: "brief",
      failed: true,
    });

    expect(state.expanded).toBe(true);
    expect(state.autoExpandedFailureKeys).toEqual([stageFailureKey(2, "brief")]);
    expect(state.manuallyCollapsedRunId).toBeNull();
  });
});

describe("run details telemetry transitions", () => {
  it("keeps successful Capture Layer completion collapsed before brief generation", () => {
    const state = simulateTelemetryRun({
      runId: 1,
      records: [
        createRunRecord({
          captureDurationMs: 12_000,
          captureOutcome: "success",
        }),
      ],
    });

    expect(state.expanded).toBe(false);
  });

  it("auto-expands when Decision Brief fails after successful Capture Layer in the same run", () => {
    const state = simulateTelemetryRun({
      runId: 1,
      records: [
        createRunRecord({
          captureDurationMs: 45_000,
          captureOutcome: "success",
        }),
        createRunRecord({
          captureDurationMs: 45_000,
          captureOutcome: "success",
          briefDurationMs: 20_000,
          briefOutcome: "error",
          briefError: "Browser generation returned an incomplete Decision Brief.",
        }),
      ],
    });

    expect(state.expanded).toBe(true);
    expect(state.autoExpandedFailureKeys).toEqual([stageFailureKey(1, "brief")]);
  });

  it("auto-expands when Capture Layer fails after model load in the same run", () => {
    const state = simulateTelemetryRun({
      runId: 1,
      records: [
        createRunRecord({
          modelLoadDurationMs: 30_000,
        }),
        createRunRecord({
          modelLoadDurationMs: 30_000,
          captureDurationMs: 15_000,
          captureOutcome: "error",
          captureError: "parse failed",
        }),
      ],
    });

    expect(state.expanded).toBe(true);
    expect(state.autoExpandedFailureKeys).toEqual([stageFailureKey(1, "capture")]);
  });

  it("remains collapsed for fully successful runs", () => {
    const state = simulateTelemetryRun({
      runId: 1,
      records: [
        createRunRecord({
          modelLoadDurationMs: 30_000,
        }),
        createRunRecord({
          modelLoadDurationMs: 30_000,
          captureDurationMs: 45_000,
          captureOutcome: "success",
        }),
        createRunRecord({
          modelLoadDurationMs: 30_000,
          captureDurationMs: 45_000,
          captureOutcome: "success",
          briefDurationMs: 20_000,
          briefOutcome: "success",
        }),
      ],
    });

    expect(state.expanded).toBe(false);
  });

  it("respects manual collapse after a later brief failure telemetry update", () => {
    let state = simulateTelemetryRun({
      runId: 1,
      records: [
        createRunRecord({
          captureDurationMs: 45_000,
          captureOutcome: "success",
        }),
        createRunRecord({
          captureDurationMs: 45_000,
          captureOutcome: "success",
          briefDurationMs: 20_000,
          briefOutcome: "error",
          briefError: "quality failure",
        }),
      ],
    });

    expect(state.expanded).toBe(true);

    state = runDetailsDisclosureReducer(state, {
      type: "toggle",
      runId: 1,
      expanded: false,
    });

    state = applyRunRecordTransition({
      state,
      previousSnapshot: {
        modelLoadCompleted: false,
        captureCompleted: true,
        briefCompleted: true,
      },
      runId: 1,
      record: createRunRecord({
        captureDurationMs: 45_000,
        captureOutcome: "success",
        briefDurationMs: 20_000,
        briefOutcome: "error",
        briefError: "quality failure",
        briefRetryCount: 1,
        webGpuEval: {
          modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
          webLlmVersion: "0.2.84",
          captureSchemaVersion: "capture-layer-v1",
          briefSchemaVersion: "decision-brief-result-v1",
          captureFirstAttemptSchemaPass: true,
          briefFirstAttemptSchemaPass: true,
          briefFirstAttemptSemanticPass: false,
          briefFirstAttemptPlaceholderLeakage: true,
          briefQualityRetryReasonCategories: ["placeholder_leakage"],
          briefQualityFailureCategories: ["placeholder_leakage"],
        },
      }),
    }).state;

    expect(state.expanded).toBe(false);
    expect(state.manuallyCollapsedRunId).toBe(1);
  });

  it("allows a subsequent failed run to expand again", () => {
    const state = simulateGenerationRunStatus({
      runs: [
        {
          runId: 1,
          records: [
            createRunRecord({
              captureOutcome: "success",
              briefOutcome: "error",
              briefError: "first failure",
            }),
          ],
        },
        {
          runId: 2,
          records: [
            createRunRecord({
              captureOutcome: "error",
              captureError: "second failure",
            }),
          ],
        },
      ],
      collapseRunIds: [1],
    });

    expect(state.expanded).toBe(true);
    expect(state.autoExpandedFailureKeys).toEqual([stageFailureKey(2, "capture")]);
  });
});

function simulateGenerationRunStatus(options: {
  runs: Array<{ runId: number; records: GenerationRunRecord[] }>;
  collapseRunIds?: number[];
}): ReturnType<typeof createRunDetailsDisclosureState> {
  let state = createRunDetailsDisclosureState();
  let snapshot = createStageCompletionSnapshot();
  let previousRunId: number | null = null;

  for (const run of options.runs) {
    if (previousRunId !== null && run.runId !== previousRunId) {
      state = createRunDetailsDisclosureState();
      snapshot = createStageCompletionSnapshot();
    }

    previousRunId = run.runId;

    for (const record of run.records) {
      const transition = applyRunRecordTransition({
        state,
        previousSnapshot: snapshot,
        runId: run.runId,
        record,
      });
      state = transition.state;
      snapshot = transition.snapshot;
    }

    if (options.collapseRunIds?.includes(run.runId)) {
      state = runDetailsDisclosureReducer(state, {
        type: "toggle",
        runId: run.runId,
        expanded: false,
      });
    }
  }

  return state;
}

describe("GenerationRunStatus integration transitions", () => {
  it("mirrors component run-id resets and staged telemetry updates", () => {
    const state = simulateGenerationRunStatus({
      runs: [
        {
          runId: 1,
          records: [
            createRunRecord({
              captureDurationMs: 45_000,
              captureOutcome: "success",
            }),
            createRunRecord({
              captureDurationMs: 45_000,
              captureOutcome: "success",
              briefDurationMs: 20_000,
              briefOutcome: "error",
              briefError: "brief failed",
            }),
          ],
        },
      ],
    });

    expect(state.expanded).toBe(true);
    expect(state.autoExpandedFailureKeys).toEqual([stageFailureKey(1, "brief")]);
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

describe("generation run stage failure detection", () => {
  it("identifies failed stages across capture and brief", () => {
    expect(
      isStageFailed(
        createRunRecord({
          captureOutcome: "error",
          captureError: "parse failed",
        }),
        "capture",
      ),
    ).toBe(true);
    expect(
      isStageFailed(
        createRunRecord({
          captureOutcome: "success",
          briefOutcome: "timeout",
          briefError: "timed out",
        }),
        "brief",
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

  it("does not treat model load completion as a failure stage", () => {
    expect(
      isStageFailed(
        createRunRecord({
          modelLoadDurationMs: 30_000,
        }),
        "model_load",
      ),
    ).toBe(false);
    expect(resolveRunTerminalStatusLabel(createRunRecord({
      modelLoadDurationMs: 30_000,
    }))).toBe("Model loaded");
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
