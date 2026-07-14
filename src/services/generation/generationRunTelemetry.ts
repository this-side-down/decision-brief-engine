import type { GenerationMode } from "./generationMode";
import { getGenerationModeLabel } from "./generationMode";
import type { StructuredCompletionDiagnostics } from "./browserGenerationDiagnostics";
import { formatStructuredCompletionDiagnosticsSummary } from "./browserGenerationDiagnostics";
import type { SemanticAcceptanceDetailedFindings } from "./decisionBriefSemanticAcceptance";
import { formatSemanticAcceptanceFindingLines } from "./decisionBriefSemanticAcceptance";

export type GenerationStep =
  | "idle"
  | "model_load"
  | "capture"
  | "capture_retry"
  | "brief";

export type StepOutcome = "success" | "timeout" | "error" | "cancelled";

export type WebGpuGenerationEval = {
  modelId: string;
  webLlmVersion: string;
  captureSchemaVersion: string;
  briefSchemaVersion: string;
  briefPromptMode: "structured_response" | "markdown_only";
  captureFirstAttemptSchemaPass: boolean | null;
  briefFirstAttemptSchemaPass: boolean | null;
  briefFirstAttemptSemanticPass: boolean | null;
  briefFirstAttemptPlaceholderLeakage: boolean | null;
  briefQualityRetryReasonCategories: string[] | null;
  briefQualityFailureCategories: string[] | null;
  briefFirstAttemptCompletionDiagnostics: StructuredCompletionDiagnostics | null;
  briefFirstAttemptSemanticFindings: SemanticAcceptanceDetailedFindings | null;
  briefQualityFailureFindings: SemanticAcceptanceDetailedFindings | null;
  completionDiagnostics: StructuredCompletionDiagnostics[];
};

export type GenerationRunRecord = {
  runtimeMode: GenerationMode;
  runtimeLabel: string;
  modelLoadDurationMs: number | null;
  captureDurationMs: number | null;
  captureRetryCount: number;
  captureOutcome: StepOutcome | null;
  captureError: string | null;
  briefDurationMs: number | null;
  briefRetryCount: number;
  briefOutcome: StepOutcome | null;
  briefError: string | null;
  webGpuEval: WebGpuGenerationEval | null;
};

export function formatElapsedSeconds(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${totalSeconds}s`;
}

export function parseTimeoutMsFromError(message: string): number | null {
  const match = message.match(/timed out after (\d+)ms/i);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function classifyStepOutcome(
  error: Error | null,
  configuredTimeoutMs?: number,
): StepOutcome {
  if (!error) {
    return "success";
  }

  if (error.name === "AbortError" || /timed out/i.test(error.message)) {
    return "timeout";
  }

  if (/cancel/i.test(error.message)) {
    return "cancelled";
  }

  if (configuredTimeoutMs && parseTimeoutMsFromError(error.message) !== null) {
    return "timeout";
  }

  return "error";
}

export function formatTimeoutDurationLabel(
  errorMessage: string,
  fallbackTimeoutMs?: number,
): string {
  const parsed = parseTimeoutMsFromError(errorMessage);
  const durationMs = parsed ?? fallbackTimeoutMs;

  if (durationMs === undefined) {
    return "timed out";
  }

  return `timed out after ${formatElapsedSeconds(durationMs)}`;
}

export function formatCaptureStepMessage(options: {
  step: "capture" | "capture_retry";
  elapsedMs: number;
}): string {
  if (options.step === "capture_retry") {
    return `Retrying Capture Layer JSON once… elapsed ${formatElapsedSeconds(options.elapsedMs)}`;
  }

  return `Generating Capture Layer… elapsed ${formatElapsedSeconds(options.elapsedMs)}`;
}

export function formatBriefStepMessage(elapsedMs: number): string {
  return `Generating Decision Brief… elapsed ${formatElapsedSeconds(elapsedMs)}`;
}

export function formatModelLoadStepMessage(elapsedMs: number): string {
  return `Downloading model… elapsed ${formatElapsedSeconds(elapsedMs)}`;
}

export function formatStepFailureMessage(options: {
  step: "capture" | "brief";
  outcome: StepOutcome;
  errorMessage: string;
  fallbackTimeoutMs?: number;
}): string {
  const label = options.step === "capture" ? "Capture Layer" : "Decision Brief";

  if (options.outcome === "timeout") {
    return `${label} ${formatTimeoutDurationLabel(
      options.errorMessage,
      options.fallbackTimeoutMs,
    )}`;
  }

  if (options.outcome === "cancelled") {
    return `${label} generation cancelled.`;
  }

  return `${label} generation failed.`;
}

export function formatDurationSummary(durationMs: number | null): string {
  if (durationMs === null) {
    return "not run";
  }

  return formatElapsedSeconds(durationMs);
}

export function formatOutcomeSummary(
  durationMs: number | null,
  outcome: StepOutcome | null,
  errorMessage: string | null,
  fallbackTimeoutMs?: number,
): string {
  if (outcome === "timeout") {
    return formatTimeoutDurationLabel(errorMessage ?? "", fallbackTimeoutMs);
  }

  if (outcome === "error" || outcome === "cancelled") {
    return outcome === "cancelled" ? "cancelled" : "failed";
  }

  return formatDurationSummary(durationMs);
}

function formatFirstAttemptSummary(value: boolean | null): string {
  if (value === null) {
    return "not run";
  }

  return value ? "pass" : "fail";
}

function emptySemanticFindings(): SemanticAcceptanceDetailedFindings {
  return {
    missingRequiredSections: [],
    traceReadinessFailures: [],
    alignmentFailures: [],
    writingHardFailures: [],
    placeholderFindings: [],
    uncoveredRecommendationStatements: [],
    uncoveredNextStepStatements: [],
  };
}

export function formatRunDetailsLines(record: GenerationRunRecord): string[] {
  const lines = [`Runtime: ${record.runtimeLabel}`];

  if (record.modelLoadDurationMs !== null) {
    lines.push(
      `Model load: ${formatDurationSummary(record.modelLoadDurationMs)}`,
    );
  }

  if (record.webGpuEval) {
    const evalRecord = record.webGpuEval;
    lines.push(
      `WebLLM: ${evalRecord.webLlmVersion} (${evalRecord.modelId})`,
    );
    lines.push(
      `Structured output schemas: ${evalRecord.captureSchemaVersion} / ${evalRecord.briefSchemaVersion}`,
    );
    if (evalRecord.briefPromptMode === "markdown_only") {
      lines.push(
        "Decision Brief experiment mode: markdown_only (Decision Trace checks not applicable)",
      );
    }
    lines.push(
      `Capture first attempt schema: ${formatFirstAttemptSummary(evalRecord.captureFirstAttemptSchemaPass)}`,
    );
    lines.push(
      `Decision Brief first attempt schema: ${formatFirstAttemptSummary(evalRecord.briefFirstAttemptSchemaPass)}`,
    );
    lines.push(
      `Decision Brief first attempt semantic quality: ${formatFirstAttemptSummary(evalRecord.briefFirstAttemptSemanticPass)}`,
    );
    if (evalRecord.briefFirstAttemptPlaceholderLeakage === true) {
      lines.push("Decision Brief placeholder leakage: detected on first attempt");
    }
    if (
      evalRecord.briefQualityRetryReasonCategories &&
      evalRecord.briefQualityRetryReasonCategories.length > 0
    ) {
      lines.push(
        `Decision Brief quality retry reason: ${evalRecord.briefQualityRetryReasonCategories.join(", ")}`,
      );
    }
    if (
      evalRecord.briefQualityFailureCategories &&
      evalRecord.briefQualityFailureCategories.length > 0
    ) {
      lines.push(
        `Decision Brief quality failure: ${evalRecord.briefQualityFailureCategories.join(", ")}`,
      );
    }

    if (evalRecord.briefFirstAttemptCompletionDiagnostics) {
      lines.push(
        `Decision Brief first attempt completion: ${formatStructuredCompletionDiagnosticsSummary(
          evalRecord.briefFirstAttemptCompletionDiagnostics,
        )}`,
      );
    }

    if (evalRecord.briefFirstAttemptSemanticPass === false) {
      for (const findingLine of formatSemanticAcceptanceFindingLines(
        evalRecord.briefFirstAttemptSemanticFindings ?? emptySemanticFindings(),
      )) {
        lines.push(`Decision Brief first attempt finding: ${findingLine}`);
      }
    }

    if (
      evalRecord.briefQualityFailureCategories &&
      evalRecord.briefQualityFailureCategories.length > 0
    ) {
      for (const findingLine of formatSemanticAcceptanceFindingLines(
        evalRecord.briefQualityFailureFindings ?? emptySemanticFindings(),
      )) {
        lines.push(`Decision Brief quality finding: ${findingLine}`);
      }
    }
  }

  lines.push(
    `Capture Layer: ${formatOutcomeSummary(
      record.captureDurationMs,
      record.captureOutcome,
      record.captureError,
    )}${record.captureRetryCount > 0 ? ` (${record.captureRetryCount} retr${record.captureRetryCount === 1 ? "y" : "ies"})` : ""}`,
  );

  lines.push(
    `Decision Brief: ${formatOutcomeSummary(
      record.briefDurationMs,
      record.briefOutcome,
      record.briefError,
    )}${record.briefRetryCount > 0 ? ` (${record.briefRetryCount} retr${record.briefRetryCount === 1 ? "y" : "ies"})` : ""}`,
  );

  if (record.captureError && record.captureOutcome !== "success") {
    lines.push(`Capture Layer error: ${record.captureError}`);
  }

  if (record.briefError && record.briefOutcome !== "success") {
    lines.push(`Decision Brief error: ${record.briefError}`);
  }

  return lines;
}

export function createGenerationRunRecord(
  runtimeMode: GenerationMode,
): GenerationRunRecord {
  return {
    runtimeMode,
    runtimeLabel: getGenerationModeLabel(runtimeMode),
    modelLoadDurationMs: null,
    captureDurationMs: null,
    captureRetryCount: 0,
    captureOutcome: null,
    captureError: null,
    briefDurationMs: null,
    briefRetryCount: 0,
    briefOutcome: null,
    briefError: null,
    webGpuEval: null,
  };
}

export function shouldShowGenerationTelemetry(mode: GenerationMode): boolean {
  return mode === "ollama" || mode === "webgpu";
}
