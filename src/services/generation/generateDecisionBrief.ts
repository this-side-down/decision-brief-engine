import type { BriefType } from "../../types/brief";
import type { CaptureLayer } from "../../types/captureLayer";
import { mockModelAdapter } from "./mockModelAdapter";
import {
  DECISION_BRIEF_MARKDOWN_STRUCTURE,
  type ModelAdapter,
} from "./types";

type GenerateDecisionBriefForSessionInput = {
  captureLayer: CaptureLayer;
  briefType: BriefType;
  adapter?: ModelAdapter;
};

export async function generateDecisionBriefForSession({
  adapter = mockModelAdapter,
  briefType,
  captureLayer,
}: GenerateDecisionBriefForSessionInput): Promise<string> {
  return adapter.generateDecisionBrief({
    captureLayer,
    briefType,
    briefTypeGuidance: briefType.guidance,
    markdownStructure: [...DECISION_BRIEF_MARKDOWN_STRUCTURE],
    toneGuidance: "Concise, executive-ready, direct, and decision-oriented.",
  });
}
