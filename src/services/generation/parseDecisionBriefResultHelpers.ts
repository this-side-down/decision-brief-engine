import type { DecisionTrace } from "../../types/decisionTrace";

export function emptyDecisionTrace(): DecisionTrace {
  return { entries: [], created_at: new Date().toISOString() };
}
