import type { GenerationRunRecord, StepOutcome } from "./generationRunTelemetry";
import { formatElapsedSeconds } from "./generationRunTelemetry";

const FAILED_OUTCOMES: StepOutcome[] = ["error", "timeout", "cancelled"];

export type RunDetailsDisclosureState = {
  expanded: boolean;
  autoExpandedRunId: number | null;
  manuallyCollapsedRunId: number | null;
};

export type RunDetailsDisclosureAction =
  | { type: "run_completed"; runId: number; failed: boolean }
  | { type: "toggle"; runId: number; expanded: boolean }
  | { type: "new_run_started" };

export function createRunDetailsDisclosureState(): RunDetailsDisclosureState {
  return {
    expanded: false,
    autoExpandedRunId: null,
    manuallyCollapsedRunId: null,
  };
}

export function runDetailsDisclosureReducer(
  state: RunDetailsDisclosureState,
  action: RunDetailsDisclosureAction,
): RunDetailsDisclosureState {
  switch (action.type) {
    case "run_completed":
      if (!action.failed) {
        return {
          ...state,
          expanded: false,
        };
      }

      if (state.manuallyCollapsedRunId === action.runId) {
        return state;
      }

      if (state.autoExpandedRunId === action.runId) {
        return state;
      }

      return {
        ...state,
        expanded: true,
        autoExpandedRunId: action.runId,
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

export function isGenerationRunTerminal(record: GenerationRunRecord): boolean {
  if (record.captureOutcome !== null) {
    return true;
  }

  return record.modelLoadDurationMs !== null;
}

export function isGenerationRunFailed(record: GenerationRunRecord): boolean {
  return (
    (record.captureOutcome !== null &&
      FAILED_OUTCOMES.includes(record.captureOutcome)) ||
    (record.briefOutcome !== null &&
      FAILED_OUTCOMES.includes(record.briefOutcome))
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
