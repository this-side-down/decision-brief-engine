import type {
  DecisionBriefResult,
  GenerateCaptureLayerInput,
  GenerateDecisionBriefInput,
  GenerateDecisionBriefOptions,
  ModelAdapter,
} from "./types";
import { ollamaGenerate } from "./ollamaClient";
import { generateOllamaDecisionBrief } from "./ollamaDecisionBriefGeneration";
import { parseCaptureLayerJson } from "./parseCaptureLayer";
import { buildCaptureLayerPrompt } from "./prompts";

export const ollamaModelAdapter: ModelAdapter = {
  async generateCaptureLayer(input: GenerateCaptureLayerInput) {
    if (!input.rawInputText.trim()) {
      throw new Error("Raw input is required to generate a Capture Layer.");
    }

    const prompt = buildCaptureLayerPrompt(input);
    const modelText = await ollamaGenerate({ prompt, format: "json" });

    return parseCaptureLayerJson(modelText);
  },

  async generateDecisionBrief(
    input: GenerateDecisionBriefInput,
    options?: GenerateDecisionBriefOptions,
  ): Promise<DecisionBriefResult> {
    return generateOllamaDecisionBrief(input, options);
  },
};
