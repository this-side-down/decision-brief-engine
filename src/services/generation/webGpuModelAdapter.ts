import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import type { DecisionTrace } from "../../types/decisionTrace";
import type {
  DecisionBriefResult,
  GenerateCaptureLayerInput,
  GenerateDecisionBriefInput,
  ModelAdapter,
} from "./types";
import { parseCaptureLayerJson } from "./parseCaptureLayer";
import { parseDecisionTraceJson } from "./parseDecisionTrace";
import {
  buildCaptureLayerPrompt,
  buildDecisionBriefPrompt,
  buildDecisionTracePrompt,
} from "./prompts";
import {
  assertGenerationNotCancelled,
  cancelWebGpuGeneration,
} from "./webGpuEngine";
import { GenerationCancelledError } from "./webGpuErrors";
import { getWebGpuConfig } from "./webGpuConfig";

function emptyDecisionTrace(): DecisionTrace {
  return { entries: [], created_at: new Date().toISOString() };
}

const JSON_RETRY_SUFFIX =
  "\n\nReturn ONLY valid JSON. No markdown fences, no commentary, no reasoning.";

type WebGpuAdapterOptions = {
  engine: MLCEngineInterface;
  signal?: AbortSignal;
  onCaptureRetry?: () => void;
  onBriefRetry?: () => void;
};

async function completePrompt(
  engine: MLCEngineInterface,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  assertGenerationNotCancelled(signal);

  try {
    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      stream: false,
    });

    assertGenerationNotCancelled(signal);

    const content = response.choices[0]?.message?.content;

    if (typeof content === "string") {
      return content.trim();
    }

    return "";
  } catch (error) {
    if (signal?.aborted) {
      await cancelWebGpuGeneration(engine);
      throw new GenerationCancelledError();
    }

    throw error;
  }
}

export function createWebGpuModelAdapter({
  engine,
  signal,
  onCaptureRetry,
  onBriefRetry,
}: WebGpuAdapterOptions): ModelAdapter {
  getWebGpuConfig();

  return {
    async generateCaptureLayer(input: GenerateCaptureLayerInput) {
      if (!input.rawInputText.trim()) {
        throw new Error("Raw input is required to generate a Capture Layer.");
      }

      const prompt = buildCaptureLayerPrompt(input);
      const modelText = await completePrompt(engine, prompt, signal);

      try {
        return parseCaptureLayerJson(modelText);
      } catch (firstError) {
        if (firstError instanceof GenerationCancelledError) {
          throw firstError;
        }

        onCaptureRetry?.();
        const retryPrompt = `${prompt}${JSON_RETRY_SUFFIX}`;
        const retryText = await completePrompt(engine, retryPrompt, signal);
        return parseCaptureLayerJson(retryText);
      }
    },

    async generateDecisionBrief(input: GenerateDecisionBriefInput): Promise<DecisionBriefResult> {
      const prompt = buildDecisionBriefPrompt(input);
      let markdown = await completePrompt(engine, prompt, signal);

      if (!markdown) {
        onBriefRetry?.();
        markdown = await completePrompt(engine, prompt, signal);
      }

      if (!markdown) {
        throw new Error(
          "Browser Decision Brief generation returned empty Markdown.",
        );
      }

      let decisionTrace: DecisionTrace;
      try {
        const tracePrompt = buildDecisionTracePrompt({
          captureLayer: input.captureLayer,
          briefMarkdown: markdown,
          briefType: input.briefType,
          sourceLabel: input.sourceLabel,
        });
        const traceJson = await completePrompt(engine, tracePrompt, signal);
        decisionTrace = parseDecisionTraceJson(traceJson);
      } catch (traceError) {
        if (traceError instanceof GenerationCancelledError) {
          throw traceError;
        }
        decisionTrace = emptyDecisionTrace();
      }

      return { markdown, decisionTrace };
    },
  };
}
