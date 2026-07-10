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

/**
 * Formats a single "N recommendation basis / N next-step bases" clause for
 * the collapsed Traceable Basis summary. Intentionally has no confidence
 * distribution or tally — counts only.
 */
function formatBasisCountClause(count: number, kindLabel: string, pluralKindLabel: string): string {
  return `${count} ${count === 1 ? kindLabel : pluralKindLabel}`;
}

/**
 * Builds the compact, count-only summary text shown on the collapsed
 * top-level Traceable Basis `<details>` (e.g. "1 recommendation basis, 6
 * next-step bases"). Returns an empty string when there is nothing to
 * summarize, so callers can fall back to a quiet empty-state label.
 */
export function formatTraceableBasisSummary(groups: DecisionTraceBasisGroups): string {
  const clauses: string[] = [];

  if (groups.recommendations.length > 0) {
    clauses.push(
      formatBasisCountClause(
        groups.recommendations.length,
        "recommendation basis",
        "recommendation bases",
      ),
    );
  }

  if (groups.nextSteps.length > 0) {
    clauses.push(
      formatBasisCountClause(groups.nextSteps.length, "next-step basis", "next-step bases"),
    );
  }

  return clauses.join(", ");
}
