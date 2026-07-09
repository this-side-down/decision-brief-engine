import type { DecisionTrace, DecisionTraceEntry } from "../types/decisionTrace";

export type DecisionTraceBasisGroups = {
  recommendations: DecisionTraceEntry[];
  nextSteps: DecisionTraceEntry[];
};

/**
 * Groups Decision Trace entries by kind for the "Traceable basis" UI section.
 *
 * Returns null when there is no Decision Trace to show (nothing new should be
 * rendered), and empty groups when the trace exists but has no entries yet
 * (caller can show a quiet empty-state note).
 */
export function groupDecisionTraceEntriesByKind(
  decisionTrace: DecisionTrace | null,
): DecisionTraceBasisGroups | null {
  if (!decisionTrace) {
    return null;
  }

  const recommendations = decisionTrace.entries.filter(
    (entry) => entry.kind === "recommendation",
  );
  const nextSteps = decisionTrace.entries.filter(
    (entry) => entry.kind === "next_step",
  );

  return { recommendations, nextSteps };
}
