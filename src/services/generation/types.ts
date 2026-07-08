import type { BriefType, BriefTypeGuidance } from "../../types/brief";
import type { CaptureLayer } from "../../types/captureLayer";

export type GenerateCaptureLayerInput = {
  rawInputText: string;
  briefType: BriefType;
  briefTypeGuidance: BriefTypeGuidance;
  captureLayerFields: string[];
  sourceLabel?: string;
};

export type GenerateDecisionBriefInput = {
  captureLayer: CaptureLayer;
  briefType: BriefType;
  briefTypeGuidance: BriefTypeGuidance;
  markdownStructure: string[];
  toneGuidance?: string;
  sourceLabel?: string;
};

export type ModelAdapter = {
  generateCaptureLayer(
    input: GenerateCaptureLayerInput,
  ): Promise<CaptureLayer>;
  generateDecisionBrief(input: GenerateDecisionBriefInput): Promise<string>;
};

export const CAPTURE_LAYER_FIELDS = [
  "source_summary",
  "decision_context",
  "stated_decision",
  "implied_decision",
  "goals",
  "stakeholders",
  "options_considered",
  "constraints",
  "risks",
  "assumptions",
  "evidence",
  "open_questions",
  "tensions",
  "recommendation_candidate",
  "confidence",
  "missing_context",
  "suggested_next_steps",
] as const;

export const DECISION_BRIEF_MARKDOWN_STRUCTURE = [
  "Summary",
  "Decision Context",
  "Options Considered",
  "Recommendation",
  "Risks and Constraints",
  "Open Questions",
  "Suggested Next Steps",
] as const;
