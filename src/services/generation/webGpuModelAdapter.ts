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
import {
  GenerationCancelledError,
  GenerationQualityError,
  InputTooLargeError,
} from "./webGpuErrors";
import { getWebGpuConfig } from "./webGpuConfig";
import {
  evaluateWebGpuCaptureInputBudget,
  formatWebGpuInputBudgetDiagnostic,
  isWebGpuContextWindowExceededError,
  WEBGPU_INPUT_TOO_LARGE_USER_MESSAGE,
} from "./webGpuInputBudget";
import {
  CAPTURE_LAYER_RESPONSE_FORMAT,
  DECISION_BRIEF_RESULT_RESPONSE_FORMAT,
  WEBGPU_CAPTURE_LAYER_SCHEMA_VERSION,
  WEBGPU_DECISION_BRIEF_RESULT_SCHEMA_VERSION,
  WEB_LLM_PACKAGE_VERSION,
} from "./webGpuGenerationSchemas";
import {
  buildDecisionBriefQualityRetrySuffix,
  evaluateDecisionBriefSemanticAcceptance,
} from "./decisionBriefSemanticAcceptance";

const JSON_RETRY_SUFFIX =
  "\n\nReturn ONLY valid JSON. No markdown fences, no commentary, no reasoning.";

export type WebGpuFirstAttemptResult = {
  parsePass: boolean;
  semanticQualityPass?: boolean | null;
  placeholderLeakageDetected?: boolean;
  retryReasonCategories?: string[];
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

function assertWebGpuCaptureInputWithinBudget(
  input: GenerateCaptureLayerInput,
): void {
  const budget = evaluateWebGpuCaptureInputBudget(input);

  if (!budget.withinBudget) {
    throw new InputTooLargeError(
      WEBGPU_INPUT_TOO_LARGE_USER_MESSAGE,
      formatWebGpuInputBudgetDiagnostic(budget),
    );
  }
}

function rethrowContextWindowErrorAsInputTooLarge(error: unknown): never {
  if (isWebGpuContextWindowExceededError(error)) {
    throw new InputTooLargeError(
      WEBGPU_INPUT_TOO_LARGE_USER_MESSAGE,
      error instanceof Error ? error.message : "context_window_exceeded",
    );
  }

  throw error;
}

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

    rethrowContextWindowErrorAsInputTooLarge(error);
  }
}

function recordBriefFirstAttemptOutcome(
  callback: WebGpuAdapterOptions["onBriefFirstAttempt"],
  options: WebGpuFirstAttemptResult,
): void {
  callback?.(options);
}

function throwBriefRetryFailure(
  failureCategories: readonly string[],
): never {
  throw new GenerationQualityError(undefined, failureCategories);
}

async function generateDecisionBriefWithQualityGate(
  engine: MLCEngineInterface,
  input: GenerateDecisionBriefInput,
  options: {
    signal?: AbortSignal;
    onBriefRetry?: () => void;
    onBriefFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
  },
): Promise<DecisionBriefResult> {
  const prompt = buildDecisionBriefPrompt(input, { mode: "structured_response" });
  const rawText = await completeStructuredPrompt(engine, {
    prompt,
    responseFormat: DECISION_BRIEF_RESULT_RESPONSE_FORMAT,
    signal: options.signal,
  });

  let firstResult: DecisionBriefResult | null = null;
  let firstSemanticFailureCategories: string[] = ["parse_schema"];

  try {
    firstResult = parseDecisionBriefResultJson(rawText);
    const semantic = evaluateDecisionBriefSemanticAcceptance({
      result: firstResult,
      captureLayer: input.captureLayer,
    });
    firstSemanticFailureCategories = semantic.failureCategories;

    recordBriefFirstAttemptOutcome(options.onBriefFirstAttempt, {
      parsePass: true,
      semanticQualityPass: semantic.accepted,
      placeholderLeakageDetected: semantic.failureCategories.includes(
        "placeholder_leakage",
      ),
      retryReasonCategories: semantic.accepted ? [] : semantic.failureCategories,
    });

    if (semantic.accepted) {
      return firstResult;
    }
  } catch (firstError) {
    if (firstError instanceof GenerationCancelledError) {
      throw firstError;
    }

    recordBriefFirstAttemptOutcome(options.onBriefFirstAttempt, {
      parsePass: false,
      semanticQualityPass: null,
      placeholderLeakageDetected: false,
      retryReasonCategories: ["parse_schema"],
    });
  }

  options.onBriefRetry?.();

  const retrySuffix = firstResult
    ? buildDecisionBriefQualityRetrySuffix(firstSemanticFailureCategories)
    : JSON_RETRY_SUFFIX;

  try {
    const retryText = await completeStructuredPrompt(engine, {
      prompt: `${prompt}${retrySuffix}`,
      responseFormat: DECISION_BRIEF_RESULT_RESPONSE_FORMAT,
      signal: options.signal,
    });
    const retryResult = parseDecisionBriefResultJson(retryText);
    const retrySemantic = evaluateDecisionBriefSemanticAcceptance({
      result: retryResult,
      captureLayer: input.captureLayer,
    });

    if (retrySemantic.accepted) {
      return retryResult;
    }

    throwBriefRetryFailure(retrySemantic.failureCategories);
  } catch (retryError) {
    if (
      retryError instanceof GenerationCancelledError ||
      retryError instanceof GenerationQualityError
    ) {
      throw retryError;
    }

    throwBriefRetryFailure(
      firstResult ? firstSemanticFailureCategories : ["parse_schema"],
    );
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

      assertWebGpuCaptureInputWithinBudget(input);

      const prompt = buildCaptureLayerPrompt(input);
      let modelText: string;

      try {
        modelText = await completeStructuredPrompt(engine, {
          prompt,
          responseFormat: CAPTURE_LAYER_RESPONSE_FORMAT,
          signal,
        });
      } catch (error) {
        if (error instanceof GenerationCancelledError || error instanceof InputTooLargeError) {
          throw error;
        }

        rethrowContextWindowErrorAsInputTooLarge(error);
      }

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
      return generateDecisionBriefWithQualityGate(engine, input, {
        signal,
        onBriefRetry,
        onBriefFirstAttempt,
      });
    },
  };
}
