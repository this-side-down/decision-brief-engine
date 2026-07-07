import type { CaptureLayer } from "./captureLayer";

export type BriefTypeId = "product" | "strategy" | "execution";

export type BriefTypeGuidance = {
  whenToUse: string;
  commonInputs: string[];
  typicalDecisionShape: string;
  outputEmphasis: string[];
  exampleDecisionQuestions: string[];
};

export type BriefType = {
  id: BriefTypeId;
  name: string;
  description: string;
  outputEmphasis: string[];
  guidance: BriefTypeGuidance;
};

export type RawInput = {
  text: string;
  sourceLabel?: string;
  createdAt: string;
};

export type BriefSessionStatus =
  | "draft"
  | "generating_capture"
  | "capture_ready"
  | "generating_brief"
  | "brief_ready"
  | "exported"
  | "error";

export type DecisionBrief = {
  markdown: string;
  generatedFromCaptureLayer: string;
  briefType: BriefType;
  editedByUser: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BriefSession = {
  id: string;
  rawInput: RawInput;
  briefType: BriefType | null;
  captureLayer: CaptureLayer | null;
  decisionBrief: DecisionBrief | null;
  status: BriefSessionStatus;
  errors: string[];
  createdAt: string;
  updatedAt: string;
};
