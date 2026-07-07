import type {
  GenerateCaptureLayerInput,
  GenerateDecisionBriefInput,
  ModelAdapter,
} from "./types";
import { ollamaGenerate } from "./ollamaClient";
import { parseCaptureLayerJson } from "./parseCaptureLayer";
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

  async generateDecisionBrief(input: GenerateDecisionBriefInput) {
    const prompt = buildDecisionBriefPrompt(input);
    const markdown = (await ollamaGenerate({ prompt })).trim();

    if (!markdown) {
      throw new Error("Ollama Decision Brief generation returned empty Markdown.");
    }

    return markdown;
  },
};
