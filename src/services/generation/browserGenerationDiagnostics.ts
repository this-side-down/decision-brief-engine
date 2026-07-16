import type {
  ChatCompletion,
  ChatCompletionFinishReason,
} from "@mlc-ai/web-llm";
import { WEB_LLM_PACKAGE_VERSION } from "./webGpuGenerationSchemas";
import type { WebGpuCandidateRecord } from "./webGpuCandidates";

export const BROWSER_GENERATION_DIAGNOSTICS_ENV =
  "VITE_BROWSER_GENERATION_DIAGNOSTICS";

export const BROWSER_GENERATION_DIAGNOSTICS_DIR =
  ".local/browser-generation-diagnostics";

export type BrowserGenerationStage =
  | "capture"
  | "capture_retry"
  | "brief"
  | "brief_retry";

export type StructuredCompletionDiagnostics = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  finishReason: ChatCompletionFinishReason | null;
  configuredMaxTokens: number | null;
  modelId: string;
  webLlmVersion: string;
  generationStage: BrowserGenerationStage;
  attemptNumber: number;
  generationDurationMs: number | null;
  endToEndLatencySeconds: number | null;
  prefillTokensPerSecond: number | null;
  decodeTokensPerSecond: number | null;
};

export type BrowserModelLoadDiagnostics = {
  modelId: string;
  webLlmVersion: string;
  modelWeights: string | null;
  modelLibrary: string | null;
  approximateDownloadBytes: number | null;
  estimatedVramMb: number | null;
  wasCached: boolean;
  loadDurationMs: number;
  outcome: "loaded" | "cancelled" | "timed_out" | "failed";
  failureMessage: string | null;
};

export type BrowserInferenceDiagnosticEvent =
  | { kind: "model_load"; detail: BrowserModelLoadDiagnostics }
  | { kind: "completion"; detail: StructuredCompletionDiagnostics };

export type StructuredCompletionRequestOptions = {
  max_tokens?: number | null;
};

function readDiagnosticEnv(name: string): string | undefined {
  const viteEnv = import.meta.env as ImportMetaEnv | undefined;
  const viteValue = viteEnv?.[name];
  if (typeof viteValue === "string" && viteValue.length > 0) {
    return viteValue;
  }

  const nodeProcess = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  const nodeValue = nodeProcess?.env?.[name];
  return typeof nodeValue === "string" && nodeValue.length > 0
    ? nodeValue
    : undefined;
}

export function isBrowserGenerationDiagnosticsEnabled(): boolean {
  return readDiagnosticEnv(BROWSER_GENERATION_DIAGNOSTICS_ENV) === "true";
}

function readNumericUsageField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildCandidateLoadFields(candidate: WebGpuCandidateRecord | null) {
  return {
    modelWeights: candidate?.modelWeights ?? null,
    modelLibrary: candidate?.modelLibrary ?? null,
    approximateDownloadBytes: candidate?.approximateDownloadBytes ?? null,
    estimatedVramMb: candidate?.estimatedVramMb ?? null,
  };
}

export function buildBrowserModelLoadDiagnostics(options: {
  modelId: string;
  candidate: WebGpuCandidateRecord | null;
  wasCached: boolean;
  loadDurationMs: number;
  outcome: BrowserModelLoadDiagnostics["outcome"];
  failureMessage?: string | null;
}): BrowserModelLoadDiagnostics {
  return {
    modelId: options.modelId,
    webLlmVersion: WEB_LLM_PACKAGE_VERSION,
    ...buildCandidateLoadFields(options.candidate),
    wasCached: options.wasCached,
    loadDurationMs: options.loadDurationMs,
    outcome: options.outcome,
    failureMessage: options.failureMessage ?? null,
  };
}

/** Exposes opt-in diagnostics without retaining prompts or hidden reasoning. */
export function publishBrowserInferenceDiagnostic(
  event: BrowserInferenceDiagnosticEvent,
): void {
  if (!isBrowserGenerationDiagnosticsEnabled()) return;

  const target = globalThis as typeof globalThis & {
    __DECISION_BRIEF_ENGINE_WEBGPU_DIAGNOSTICS__?: BrowserInferenceDiagnosticEvent[];
  };
  const events = target.__DECISION_BRIEF_ENGINE_WEBGPU_DIAGNOSTICS__ ?? [];
  events.push(event);
  target.__DECISION_BRIEF_ENGINE_WEBGPU_DIAGNOSTICS__ = events;
  console.info("[Decision Brief Engine WebGPU diagnostic]", event);
}

function readFinishReason(value: unknown): ChatCompletionFinishReason | null {
  if (
    value === "stop" ||
    value === "length" ||
    value === "tool_calls" ||
    value === "abort"
  ) {
    return value;
  }

  return null;
}

/**
 * Extract nullable provider completion diagnostics from a WebLLM response.
 * Does not fabricate token counts or finish reasons when unavailable.
 */
export function extractStructuredCompletionDiagnostics(options: {
  response: ChatCompletion;
  generationStage: BrowserGenerationStage;
  attemptNumber: number;
  modelId: string;
  webLlmVersion?: string;
  requestOptions?: StructuredCompletionRequestOptions;
  generationDurationMs?: number | null;
}): StructuredCompletionDiagnostics {
  const usage = options.response.usage;
  const configuredMaxTokens =
    options.requestOptions?.max_tokens === undefined ||
    options.requestOptions.max_tokens === null
      ? null
      : options.requestOptions.max_tokens;
  const usageExtra = usage?.extra;

  return {
    promptTokens: readNumericUsageField(usage?.prompt_tokens),
    completionTokens: readNumericUsageField(usage?.completion_tokens),
    totalTokens: readNumericUsageField(usage?.total_tokens),
    finishReason: readFinishReason(options.response.choices[0]?.finish_reason),
    configuredMaxTokens,
    modelId: options.modelId,
    webLlmVersion: options.webLlmVersion ?? WEB_LLM_PACKAGE_VERSION,
    generationStage: options.generationStage,
    attemptNumber: options.attemptNumber,
    generationDurationMs: options.generationDurationMs ?? null,
    endToEndLatencySeconds: readNumericUsageField(usageExtra?.e2e_latency_s),
    prefillTokensPerSecond: readNumericUsageField(
      usageExtra?.prefill_tokens_per_s,
    ),
    decodeTokensPerSecond: readNumericUsageField(
      usageExtra?.decode_tokens_per_s,
    ),
  };
}

export type BrowserGenerationRawCaptureArtifact = {
  artifactVersion: 1;
  runTimestamp: string;
  sourceLabel: string | null;
  briefTypeId: string | null;
  configuration: {
    modelId: string;
    webLlmVersion: string;
    captureSchemaVersion: string;
    briefSchemaVersion: string;
    briefPromptMode: "structured_response" | "markdown_only";
    configuredMaxTokens: number | null;
  };
  attempt: {
    generationStage: BrowserGenerationStage;
    attemptNumber: number;
  };
  completion: StructuredCompletionDiagnostics;
  rawOutput: string;
};

export function formatStructuredCompletionDiagnosticsSummary(
  diagnostics: StructuredCompletionDiagnostics,
): string {
  const promptTokens =
    diagnostics.promptTokens === null ? "unavailable" : String(diagnostics.promptTokens);
  const completionTokens =
    diagnostics.completionTokens === null
      ? "unavailable"
      : String(diagnostics.completionTokens);
  const totalTokens =
    diagnostics.totalTokens === null ? "unavailable" : String(diagnostics.totalTokens);
  const finishReason =
    diagnostics.finishReason === null ? "unavailable" : diagnostics.finishReason;
  const configuredMaxTokens =
    diagnostics.configuredMaxTokens === null
      ? "not set"
      : String(diagnostics.configuredMaxTokens);

  return [
    `${diagnostics.generationStage} attempt ${diagnostics.attemptNumber}`,
    `prompt_tokens=${promptTokens}`,
    `completion_tokens=${completionTokens}`,
    `total_tokens=${totalTokens}`,
    `finish_reason=${finishReason}`,
    `max_tokens=${configuredMaxTokens}`,
    `duration_ms=${diagnostics.generationDurationMs ?? "unavailable"}`,
    `decode_tokens_per_s=${diagnostics.decodeTokensPerSecond ?? "unavailable"}`,
  ].join("; ");
}
