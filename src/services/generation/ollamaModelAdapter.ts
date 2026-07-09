import type { DecisionTrace } from "../../types/decisionTrace";
import type {
  DecisionBriefResult,
  GenerateCaptureLayerInput,
  GenerateDecisionBriefInput,
  ModelAdapter,
} from "./types";
import { ollamaGenerate } from "./ollamaClient";
import { parseCaptureLayerJson } from "./parseCaptureLayer";
import { parseDecisionTraceJson } from "./parseDecisionTrace";
import {
  buildCaptureLayerPrompt,
  buildDecisionBriefPrompt,
  buildDecisionTracePrompt,
} from "./prompts";

function emptyDecisionTrace(): DecisionTrace {
  return { entries: [], created_at: new Date().toISOString() };
}

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
    const briefPrompt = buildDecisionBriefPrompt(input);
    const markdown = (await ollamaGenerate({ prompt: briefPrompt })).trim();

    if (!markdown) {
      throw new Error("Ollama Decision Brief generation returned empty Markdown.");
    }

    let decisionTrace: DecisionTrace;
    try {
      const tracePrompt = buildDecisionTracePrompt({
        captureLayer: input.captureLayer,
        briefMarkdown: markdown,
        briefType: input.briefType,
        sourceLabel: input.sourceLabel,
      });
      const traceJson = await ollamaGenerate({ prompt: tracePrompt, format: "json" });
      decisionTrace = parseDecisionTraceJson(traceJson);
    } catch {
      decisionTrace = emptyDecisionTrace();
    }

    return { markdown, decisionTrace };
  },
};
