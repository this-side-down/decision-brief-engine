import type { BriefType } from "../../types/brief";
import type { CaptureLayer } from "../../types/captureLayer";
import { getModelAdapter } from "./getModelAdapter";
import {
  DECISION_BRIEF_MARKDOWN_STRUCTURE,
  type DecisionBriefResult,
  type ModelAdapter,
} from "./types";

type GenerateDecisionBriefForSessionInput = {
  captureLayer: CaptureLayer;
  briefType: BriefType;
  sourceLabel?: string;
  adapter?: ModelAdapter;
};

export async function generateDecisionBriefForSession({
  adapter = getModelAdapter(),
  briefType,
  captureLayer,
  sourceLabel,
}: GenerateDecisionBriefForSessionInput): Promise<DecisionBriefResult> {
  return adapter.generateDecisionBrief({
    captureLayer,
    briefType,
    briefTypeGuidance: briefType.guidance,
    markdownStructure: [...DECISION_BRIEF_MARKDOWN_STRUCTURE],
    toneGuidance: "Concise, executive-ready, direct, and decision-oriented.",
    sourceLabel,
  });
}
