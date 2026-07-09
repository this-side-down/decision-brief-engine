import type {
  DecisionBriefResult,
  GenerateCaptureLayerInput,
  GenerateDecisionBriefInput,
  ModelAdapter,
} from "./types";
import { ollamaGenerate } from "./ollamaClient";
import { parseCaptureLayerJson } from "./parseCaptureLayer";
import { parseDecisionBriefResultJson } from "./parseDecisionBriefResult";
import { buildCaptureLayerPrompt, buildDecisionBriefPrompt } from "./prompts";

export const ollamaModelAdapter: ModelAdapter = {
  async generateCaptureLayer(input: GenerateCaptureLayerInput) {
    if (!input.rawInputText.trim()) {
      throw new Error("Raw input is required to generate a Capture Layer.");
    }

    const prompt = buildCaptureLayerPrompt(input);
    const modelText = await ollamaGenerate({ prompt, format: "json" });

    return parseCaptureLayerJson(modelText);
  },

  async generateDecisionBrief(input: GenerateDecisionBriefInput): Promise<DecisionBriefResult> {
    const prompt = buildDecisionBriefPrompt(input);
    const rawText = await ollamaGenerate({ prompt, format: "json" });

    return parseDecisionBriefResultJson(rawText);
  },
};
