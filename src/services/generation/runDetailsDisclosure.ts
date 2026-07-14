import type { GenerationRunRecord, StepOutcome } from "./generationRunTelemetry";
import { formatElapsedSeconds } from "./generationRunTelemetry";

const FAILED_OUTCOMES: StepOutcome[] = ["error", "timeout", "cancelled"];

export type GenerationStage = "model_load" | "capture" | "brief";

export type StageCompletionSnapshot = {
  modelLoadCompleted: boolean;
  captureCompleted: boolean;
  briefCompleted: boolean;
};

export type RunDetailsDisclosureState = {
  expanded: boolean;
  autoExpandedFailureKeys: string[];
  manuallyCollapsedRunId: number | null;
};

export type RunDetailsDisclosureAction =
  | {
      type: "stage_completed";
      runId: number;
      stage: GenerationStage;
      failed: boolean;
    }
  | { type: "toggle"; runId: number; expanded: boolean }
  | { type: "new_run_started" };

export function createRunDetailsDisclosureState(): RunDetailsDisclosureState {
  return {
    expanded: false,
    autoExpandedFailureKeys: [],
    manuallyCollapsedRunId: null,
  };
}

export function createStageCompletionSnapshot(): StageCompletionSnapshot {
  return {
    modelLoadCompleted: false,
    captureCompleted: false,
    briefCompleted: false,
  };
}

export function stageFailureKey(
  runId: number,
  stage: GenerationStage,
): string {
  return `${runId}:${stage}`;
}

export function runDetailsDisclosureReducer(
  state: RunDetailsDisclosureState,
  action: RunDetailsDisclosureAction,
): RunDetailsDisclosureState {
  switch (action.type) {
    case "stage_completed":
      if (!action.failed) {
        return {
          ...state,
          expanded: false,
        };
      }

      if (state.manuallyCollapsedRunId === action.runId) {
        return state;
      }

      if (
        state.autoExpandedFailureKeys.includes(
          stageFailureKey(action.runId, action.stage),
        )
      ) {
        return state;
      }

      return {
        ...state,
        expanded: true,
        autoExpandedFailureKeys: [
          ...state.autoExpandedFailureKeys,
          stageFailureKey(action.runId, action.stage),
        ],
      };
    case "toggle":
      return {
        ...state,
        expanded: action.expanded,
        manuallyCollapsedRunId: action.expanded
          ? state.manuallyCollapsedRunId
          : action.runId,
      };
    case "new_run_started":
      return createRunDetailsDisclosureState();
    default:
      return state;
  }
}

export function getStageCompletionSnapshot(
  record: GenerationRunRecord,
): StageCompletionSnapshot {
  return {
    modelLoadCompleted: record.modelLoadDurationMs !== null,
    captureCompleted: record.captureOutcome !== null,
    briefCompleted: record.briefOutcome !== null,
  };
}

export function detectNewlyCompletedStages(
  previous: StageCompletionSnapshot,
  current: StageCompletionSnapshot,
): GenerationStage[] {
  const stages: GenerationStage[] = [];

  if (current.modelLoadCompleted && !previous.modelLoadCompleted) {
    stages.push("model_load");
  }

  if (current.captureCompleted && !previous.captureCompleted) {
    stages.push("capture");
  }

  if (current.briefCompleted && !previous.briefCompleted) {
    stages.push("brief");
  }

  return stages;
}

export function isStageFailed(
  record: GenerationRunRecord,
  stage: GenerationStage,
): boolean {
  switch (stage) {
    case "model_load":
      return false;
    case "capture":
      return (
        record.captureOutcome !== null &&
        FAILED_OUTCOMES.includes(record.captureOutcome)
      );
    case "brief":
      return (
        record.briefOutcome !== null &&
        FAILED_OUTCOMES.includes(record.briefOutcome)
      );
  }
}

export function applyRunRecordTransition(options: {
  state: RunDetailsDisclosureState;
  previousSnapshot: StageCompletionSnapshot;
  runId: number;
  record: GenerationRunRecord;
}): {
  state: RunDetailsDisclosureState;
  snapshot: StageCompletionSnapshot;
} {
  const snapshot = getStageCompletionSnapshot(options.record);
  const newlyCompletedStages = detectNewlyCompletedStages(
    options.previousSnapshot,
    snapshot,
  );

  let state = options.state;

  for (const stage of newlyCompletedStages) {
    state = runDetailsDisclosureReducer(state, {
      type: "stage_completed",
      runId: options.runId,
      stage,
      failed: isStageFailed(options.record, stage),
    });
  }

  return { state, snapshot };
}

export function isGenerationRunFailed(record: GenerationRunRecord): boolean {
  return (
    isStageFailed(record, "capture") || isStageFailed(record, "brief")
  );
}

export function resolveRunTerminalStatusLabel(
  record: GenerationRunRecord,
): string {
  if (record.briefOutcome === "error") {
    return "Decision Brief failed";
  }

  if (record.briefOutcome === "timeout") {
    return "Decision Brief timed out";
  }

  if (record.briefOutcome === "cancelled") {
    return "Decision Brief cancelled";
  }

  if (record.briefOutcome === "success") {
    return "Completed";
  }

  if (record.captureOutcome === "error") {
    return "Capture Layer failed";
  }

  if (record.captureOutcome === "timeout") {
    return "Capture Layer timed out";
  }

  if (record.captureOutcome === "cancelled") {
    return "Capture Layer cancelled";
  }

  if (record.captureOutcome === "success") {
    return "Capture Layer succeeded";
  }

  if (record.modelLoadDurationMs !== null) {
    return "Model loaded";
  }

  return "In progress";
}

export function calculateRunTotalDurationMs(
  record: GenerationRunRecord,
): number | null {
  const durations = [
    record.modelLoadDurationMs,
    record.captureDurationMs,
    record.briefDurationMs,
  ].filter((duration): duration is number => duration !== null);

  if (durations.length === 0) {
    return null;
  }

  return durations.reduce((total, duration) => total + duration, 0);
}

export function formatRunRetrySummary(record: GenerationRunRecord): string | null {
  const retryCount = record.captureRetryCount + record.briefRetryCount;

  if (retryCount <= 0) {
    return null;
  }

  return `${retryCount} retr${retryCount === 1 ? "y" : "ies"}`;
}

export function formatRunDetailsCollapsedSummary(
  record: GenerationRunRecord,
): string {
  const parts = [record.runtimeLabel, resolveRunTerminalStatusLabel(record)];
  const totalDurationMs = calculateRunTotalDurationMs(record);

  if (totalDurationMs !== null) {
    parts.push(formatElapsedSeconds(totalDurationMs));
  }

  const retrySummary = formatRunRetrySummary(record);
  if (retrySummary) {
    parts.push(retrySummary);
  }

  return parts.join(" · ");
}
