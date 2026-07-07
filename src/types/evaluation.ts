import type { BriefType } from "./brief";

export type EvaluationCase = {
  id: string;
  name: string;
  rawInput: string;
  briefType: BriefType;
  expectedQualities: string[];
  knownRisks: string[];
};
