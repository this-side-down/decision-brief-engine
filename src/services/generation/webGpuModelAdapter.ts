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
  formatSemanticAcceptanceFindingLines,
  type SemanticAcceptanceDetailedFindings,
} from "./decisionBriefSemanticAcceptance";
import {
  type BrowserGenerationRawCaptureArtifact,
  type BrowserGenerationStage,
  type StructuredCompletionDiagnostics,
  extractStructuredCompletionDiagnostics,
} from "./browserGenerationDiagnostics";
import {
  buildBrowserGenerationDiagnosticFilename,
  persistBrowserGenerationDiagnosticArtifact,
} from "./browserGenerationLocalCapture";

const JSON_RETRY_SUFFIX =
  "\n\nReturn ONLY valid JSON. No markdown fences, no commentary, no reasoning.";

export type WebGpuFirstAttemptResult = {
  parsePass: boolean;
  semanticQualityPass?: boolean | null;
  placeholderLeakageDetected?: boolean;
  retryReasonCategories?: string[];
  completionDiagnostics?: StructuredCompletionDiagnostics | null;
  semanticFindings?: SemanticAcceptanceDetailedFindings | null;
};

export type WebGpuEvalContext = {
  modelId: string;
  webLlmVersion: string;
  captureSchemaVersion: string;
  briefSchemaVersion: string;
};

export type WebGpuGenerationCaptureContext = {
  sourceLabel?: string | null;
  briefTypeId?: string | null;
  runTimestamp?: string;
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
  captureContext?: WebGpuGenerationCaptureContext;
  onCaptureRetry?: () => void;
  onBriefRetry?: () => void;
  onCaptureFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
  onBriefFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
  onCompletionDiagnostics?: (
    diagnostics: StructuredCompletionDiagnostics,
  ) => void;
};

type StructuredCompletionOptions = {
  prompt: string;
  responseFormat: ResponseFormat;
  signal?: AbortSignal;
  generationStage: BrowserGenerationStage;
  attemptNumber: number;
};

type StructuredCompletionResult = {
  content: string;
  diagnostics: StructuredCompletionDiagnostics;
};

function createRunTimestamp(context?: WebGpuGenerationCaptureContext): string {
  return context?.runTimestamp ?? new Date().toISOString();
}

async function maybePersistRawOutput(options: {
  captureContext?: WebGpuGenerationCaptureContext;
  generationStage: BrowserGenerationStage;
  attemptNumber: number;
  diagnostics: StructuredCompletionDiagnostics;
  rawOutput: string;
}): Promise<void> {
  const runTimestamp = createRunTimestamp(options.captureContext);
  const filename = buildBrowserGenerationDiagnosticFilename({
    runTimestamp,
    generationStage: options.generationStage,
    attemptNumber: options.attemptNumber,
  });

  const artifact: BrowserGenerationRawCaptureArtifact = {
    artifactVersion: 1,
    runTimestamp,
    sourceLabel: options.captureContext?.sourceLabel ?? null,
    briefTypeId: options.captureContext?.briefTypeId ?? null,
    configuration: {
      modelId: options.diagnostics.modelId,
      webLlmVersion: options.diagnostics.webLlmVersion,
      captureSchemaVersion: WEBGPU_CAPTURE_LAYER_SCHEMA_VERSION,
      briefSchemaVersion: WEBGPU_DECISION_BRIEF_RESULT_SCHEMA_VERSION,
      configuredMaxTokens: options.diagnostics.configuredMaxTokens,
    },
    attempt: {
      generationStage: options.generationStage,
      attemptNumber: options.attemptNumber,
    },
    completion: options.diagnostics,
    rawOutput: options.rawOutput,
  };

  await persistBrowserGenerationDiagnosticArtifact({
    filename,
    artifact,
  });
}

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
  callbacks: Pick<
    WebGpuAdapterOptions,
    "onCompletionDiagnostics" | "captureContext"
  >,
): Promise<StructuredCompletionResult> {
  assertGenerationNotCancelled(options.signal);
  const { modelId } = getWebGpuConfig();

  try {
    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: options.prompt }],
      stream: false,
      response_format: options.responseFormat,
    });

    assertGenerationNotCancelled(options.signal);

    const diagnostics = extractStructuredCompletionDiagnostics({
      response,
      generationStage: options.generationStage,
      attemptNumber: options.attemptNumber,
      modelId,
      requestOptions: {},
    });
    callbacks.onCompletionDiagnostics?.(diagnostics);

    const content = response.choices[0]?.message?.content;
    const normalizedContent = typeof content === "string" ? content.trim() : "";

    await maybePersistRawOutput({
      captureContext: callbacks.captureContext,
      generationStage: options.generationStage,
      attemptNumber: options.attemptNumber,
      diagnostics,
      rawOutput: normalizedContent,
    });

    return {
      content: normalizedContent,
      diagnostics,
    };
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
  semanticFindings?: SemanticAcceptanceDetailedFindings | null,
): never {
  throw new GenerationQualityError(
    undefined,
    failureCategories,
    semanticFindings ?? undefined,
  );
}

async function generateDecisionBriefWithQualityGate(
  engine: MLCEngineInterface,
  input: GenerateDecisionBriefInput,
  options: {
    signal?: AbortSignal;
    captureContext?: WebGpuGenerationCaptureContext;
    onBriefRetry?: () => void;
    onBriefFirstAttempt?: (result: WebGpuFirstAttemptResult) => void;
    onCompletionDiagnostics?: (
      diagnostics: StructuredCompletionDiagnostics,
    ) => void;
  },
): Promise<DecisionBriefResult> {
  const prompt = buildDecisionBriefPrompt(input, { mode: "structured_response" });
  const firstCompletion = await completeStructuredPrompt(
    engine,
    {
      prompt,
      responseFormat: DECISION_BRIEF_RESULT_RESPONSE_FORMAT,
      signal: options.signal,
      generationStage: "brief",
      attemptNumber: 1,
    },
    options,
  );
  const rawText = firstCompletion.content;

  let firstResult: DecisionBriefResult | null = null;
  let firstSemanticFailureCategories: string[] = ["parse_schema"];
  let firstSemanticFindings: SemanticAcceptanceDetailedFindings | null = null;

  try {
    firstResult = parseDecisionBriefResultJson(rawText);
    const semantic = evaluateDecisionBriefSemanticAcceptance({
      result: firstResult,
      captureLayer: input.captureLayer,
    });
    firstSemanticFailureCategories = semantic.failureCategories;
    firstSemanticFindings = semantic.detailedFindings;

    recordBriefFirstAttemptOutcome(options.onBriefFirstAttempt, {
      parsePass: true,
      semanticQualityPass: semantic.accepted,
      placeholderLeakageDetected: semantic.failureCategories.includes(
        "placeholder_leakage",
      ),
      retryReasonCategories: semantic.accepted ? [] : semantic.failureCategories,
      completionDiagnostics: firstCompletion.diagnostics,
      semanticFindings: semantic.detailedFindings,
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
      completionDiagnostics: firstCompletion.diagnostics,
      semanticFindings: null,
    });
  }

  options.onBriefRetry?.();

  const retrySuffix = firstResult
    ? buildDecisionBriefQualityRetrySuffix(firstSemanticFailureCategories)
    : JSON_RETRY_SUFFIX;

  try {
    const retryCompletion = await completeStructuredPrompt(
      engine,
      {
        prompt: `${prompt}${retrySuffix}`,
        responseFormat: DECISION_BRIEF_RESULT_RESPONSE_FORMAT,
        signal: options.signal,
        generationStage: "brief_retry",
        attemptNumber: 2,
      },
      options,
    );
    const retryText = retryCompletion.content;
    const retryResult = parseDecisionBriefResultJson(retryText);
    const retrySemantic = evaluateDecisionBriefSemanticAcceptance({
      result: retryResult,
      captureLayer: input.captureLayer,
    });

    if (retrySemantic.accepted) {
      return retryResult;
    }

    throwBriefRetryFailure(
      retrySemantic.failureCategories,
      retrySemantic.detailedFindings,
    );
  } catch (retryError) {
    if (
      retryError instanceof GenerationCancelledError ||
      retryError instanceof GenerationQualityError
    ) {
      throw retryError;
    }

    throwBriefRetryFailure(
      firstResult ? firstSemanticFailureCategories : ["parse_schema"],
      firstSemanticFindings,
    );
  }
}

export function getWebGpuSemanticFindingSummaryLines(
  findings: SemanticAcceptanceDetailedFindings | null | undefined,
): string[] {
  if (!findings) {
    return [];
  }

  return formatSemanticAcceptanceFindingLines(findings);
}

export function createWebGpuModelAdapter({
  engine,
  signal,
  captureContext,
  onCaptureRetry,
  onBriefRetry,
  onCaptureFirstAttempt,
  onBriefFirstAttempt,
  onCompletionDiagnostics,
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
        const completion = await completeStructuredPrompt(
          engine,
          {
            prompt,
            responseFormat: CAPTURE_LAYER_RESPONSE_FORMAT,
            signal,
            generationStage: "capture",
            attemptNumber: 1,
          },
          { captureContext, onCompletionDiagnostics },
        );
        modelText = completion.content;
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
        const retryCompletion = await completeStructuredPrompt(
          engine,
          {
            prompt: retryPrompt,
            responseFormat: CAPTURE_LAYER_RESPONSE_FORMAT,
            signal,
            generationStage: "capture_retry",
            attemptNumber: 2,
          },
          { captureContext, onCompletionDiagnostics },
        );
        return parseCaptureLayerJson(retryCompletion.content);
      }
    },

    async generateDecisionBrief(input: GenerateDecisionBriefInput): Promise<DecisionBriefResult> {
      return generateDecisionBriefWithQualityGate(engine, input, {
        signal,
        captureContext,
        onBriefRetry,
        onBriefFirstAttempt,
        onCompletionDiagnostics,
      });
    },
  };
}
