import type { MLCEngineInterface, ResponseFormat } from "@mlc-ai/web-llm";
import type {
  DecisionBriefResult,
  GenerateCaptureLayerInput,
  GenerateDecisionBriefInput,
  ModelAdapter,
} from "./types";
import { parseCaptureLayerJson } from "./parseCaptureLayer";
import { parseDecisionBriefResultJson } from "./parseDecisionBriefResult";
import { buildCaptureLayerPrompt, buildDecisionBriefPrompt } from "./prompts";
import {
  assertGenerationNotCancelled,
  cancelWebGpuGeneration,
} from "./webGpuEngine";
import { GenerationCancelledError } from "./webGpuErrors";
import { getWebGpuConfig } from "./webGpuConfig";
import {
  CAPTURE_LAYER_RESPONSE_FORMAT,
  DECISION_BRIEF_RESULT_RESPONSE_FORMAT,
  WEBGPU_CAPTURE_LAYER_SCHEMA_VERSION,
  WEBGPU_DECISION_BRIEF_RESULT_SCHEMA_VERSION,
  WEB_LLM_PACKAGE_VERSION,
} from "./webGpuGenerationSchemas";

const JSON_RETRY_SUFFIX =
  "\n\nReturn ONLY valid JSON. No markdown fences, no commentary, no reasoning.";

export type WebGpuFirstAttemptResult = {
  parsePass: boolean;
};

export type WebGpuEvalContext = {
  modelId: string;
  webLlmVersion: string;
  captureSchemaVersion: string;
  briefSchemaVersion: string;
};

export function getWebGpuEvalContext(): WebGpuEvalContext {
  const { modelId } = getWebGpuConfig();

  return {
    modelId,
    webLlmVersion: WEB_LLM_PACKAGE_VERSION,
    captureSchemaVersion: WEBGPU_CAPTURE_LAYER_SCHEMA_VERSION,
    briefSchemaVersion: WEBGPU_DECISION_BRIEF_RESULT_SCHEMA_VERSION,
  };
}

type WebGpuAdapterOptions = {
  engine: MLCEngineInterface;
  signal?: AbortSignal;
  onCaptureRetry?: () => void;
  onBriefRetry?: () => void;
  onCaptureFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
  onBriefFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
};

type StructuredCompletionOptions = {
  prompt: string;
  responseFormat: ResponseFormat;
  signal?: AbortSignal;
};

async function completeStructuredPrompt(
  engine: MLCEngineInterface,
  options: StructuredCompletionOptions,
): Promise<string> {
  assertGenerationNotCancelled(options.signal);

  try {
    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: options.prompt }],
      stream: false,
      response_format: options.responseFormat,
    });

    assertGenerationNotCancelled(options.signal);

    const content = response.choices[0]?.message?.content;

    if (typeof content === "string") {
      return content.trim();
    }

    return "";
  } catch (error) {
    if (options.signal?.aborted) {
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
  onCaptureFirstAttempt,
  onBriefFirstAttempt,
}: WebGpuAdapterOptions): ModelAdapter {
  getWebGpuConfig();

  return {
    async generateCaptureLayer(input: GenerateCaptureLayerInput) {
      if (!input.rawInputText.trim()) {
        throw new Error("Raw input is required to generate a Capture Layer.");
      }

      const prompt = buildCaptureLayerPrompt(input);
      const modelText = await completeStructuredPrompt(engine, {
        prompt,
        responseFormat: CAPTURE_LAYER_RESPONSE_FORMAT,
        signal,
      });

      try {
        const captureLayer = parseCaptureLayerJson(modelText);
        onCaptureFirstAttempt?.({ parsePass: true });
        return captureLayer;
      } catch (firstError) {
        if (firstError instanceof GenerationCancelledError) {
          throw firstError;
        }

        onCaptureFirstAttempt?.({ parsePass: false });
        onCaptureRetry?.();
        const retryPrompt = `${prompt}${JSON_RETRY_SUFFIX}`;
        const retryText = await completeStructuredPrompt(engine, {
          prompt: retryPrompt,
          responseFormat: CAPTURE_LAYER_RESPONSE_FORMAT,
          signal,
        });
        return parseCaptureLayerJson(retryText);
      }
    },

    async generateDecisionBrief(input: GenerateDecisionBriefInput): Promise<DecisionBriefResult> {
      const prompt = buildDecisionBriefPrompt(input);
      const rawText = await completeStructuredPrompt(engine, {
        prompt,
        responseFormat: DECISION_BRIEF_RESULT_RESPONSE_FORMAT,
        signal,
      });

      try {
        const result = parseDecisionBriefResultJson(rawText);
        onBriefFirstAttempt?.({ parsePass: true });
        return result;
      } catch (firstError) {
        if (firstError instanceof GenerationCancelledError) {
          throw firstError;
        }

        onBriefFirstAttempt?.({ parsePass: false });
        onBriefRetry?.();
        const retryText = await completeStructuredPrompt(engine, {
          prompt: `${prompt}${JSON_RETRY_SUFFIX}`,
          responseFormat: DECISION_BRIEF_RESULT_RESPONSE_FORMAT,
          signal,
        });
        return parseDecisionBriefResultJson(retryText);
      }
    },
  };
}
