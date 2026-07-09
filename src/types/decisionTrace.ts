import type { Confidence } from "./captureLayer";

export type DecisionTraceEntryKind = "recommendation" | "next_step";

export type DecisionTraceBasis = {
  intent: string;
  supporting_evidence: string[];
  assumptions_relied_on: string[];
  risks_addressed: string[];
  risks_accepted: string[];
  constraints_respected: string[];
  tradeoffs: string[];
  alternatives_considered: string[];
  missing_context_caveats: string[];
};

export type DecisionTraceEntry = {
  statement: string;
  kind: DecisionTraceEntryKind;
  basis: DecisionTraceBasis;
  confidence: Confidence;
  would_change_if: string[];
};

export type DecisionTrace = {
  entries: DecisionTraceEntry[];
  created_at: string;
};
