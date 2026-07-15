import type { BriefType } from "../../types/brief";
import type { CaptureLayer } from "../../types/captureLayer";
import {
  getGenerationModePreference,
  resolveEffectiveMode,
  type GenerationMode,
} from "./generationMode";
import { getModelAdapter } from "./getModelAdapter";
import { getLongInputCaptureCapability } from "./longInput/longInputCapability";
import { resolveCapturePath } from "./longInput/inputBudgetPolicy";
import {
  formatLongInputProgressMessage,
  type LongInputCaptureDiagnostics,
  type LongInputProgressState,
} from "./longInput/types";
import { runLongInputCapture } from "./longInput/runLongInputCapture";
import { CAPTURE_LAYER_FIELDS, type ModelAdapter } from "./types";
import { findUnsupportedNextSteps } from "./nextStepBasisConstructability";
import { GenerationCancelledError } from "./webGpuErrors";
import { LongInputSupersededError } from "./longInput/longInputErrors";

export type CaptureLayerQualityDiagnostics = {
  attemptCount: number;
  retryCategory: "none" | "unsupported_next_steps";
  attempts: Array<{ attemptNumber: number; unsupportedNextSteps: string[] }>;
};

export class CaptureLayerNextStepQualityError extends Error {
  readonly unsupportedNextSteps: string[];
  readonly diagnostics: CaptureLayerQualityDiagnostics;

  constructor(
    unsupportedNextSteps: string[],
    diagnostics: CaptureLayerQualityDiagnostics,
  ) {
    super(
      `Capture Layer contains unsupported suggested_next_steps after bounded retry: ${unsupportedNextSteps
        .map((step) => `"${step}"`)
        .join("; ")}`,
    );
    this.name = "CaptureLayerNextStepQualityError";
    this.unsupportedNextSteps = unsupportedNextSteps;
    this.diagnostics = diagnostics;
  }
}

type GenerateCaptureLayerForSessionInput = {
  rawInputText: string;
  briefType: BriefType;
  sourceLabel?: string;
  adapter?: ModelAdapter;
  mode?: GenerationMode;
  signal?: AbortSignal;
  runId?: number;
  activeRunId?: number;
  onProgress?: (progress: LongInputProgressState) => void;
  interChunkDelayMs?: number;
  longInputDiagnostics?: { value: LongInputCaptureDiagnostics | null };
  qualityDiagnostics?: { value: CaptureLayerQualityDiagnostics | null };
};

export async function generateCaptureLayerForSession({
  adapter = getModelAdapter(),
  briefType,
  rawInputText,
  sourceLabel,
  mode = resolveEffectiveMode(getGenerationModePreference()),
  signal,
  runId,
  activeRunId,
  onProgress,
  interChunkDelayMs,
  longInputDiagnostics,
  qualityDiagnostics,
}: GenerateCaptureLayerForSessionInput): Promise<CaptureLayer> {
  const captureInput = {
    rawInputText,
    briefType,
    briefTypeGuidance: briefType.guidance,
    captureLayerFields: [...CAPTURE_LAYER_FIELDS],
    sourceLabel,
  };

  const assertActive = () => {
    if (signal?.aborted) throw new GenerationCancelledError();
    if (
      runId !== undefined &&
      activeRunId !== undefined &&
      runId !== activeRunId
    ) {
      throw new LongInputSupersededError();
    }
  };

  const generateAttempt = async (feedback?: string[]): Promise<CaptureLayer> => {
    assertActive();
    const attemptInput = {
      ...captureInput,
      captureQualityRetryFeedback: feedback,
    };
    if (resolveCapturePath(rawInputText) === "hierarchical") {
      const capability = getLongInputCaptureCapability(mode);
      if (capability) {
        const result = await runLongInputCapture({
          input: attemptInput,
          capability,
          signal,
          runId,
          activeRunId,
          onProgress,
          interChunkDelayMs,
        });

        if (longInputDiagnostics) {
          longInputDiagnostics.value = result.diagnostics;
        }

        return result.captureLayer;
      }
    }
    if (longInputDiagnostics) longInputDiagnostics.value = null;
    return adapter.generateCaptureLayer(attemptInput);
  };

  const diagnostics: CaptureLayerQualityDiagnostics = {
    attemptCount: 0,
    retryCategory: "none",
    attempts: [],
  };
  const first = await generateAttempt();
  const firstUnsupported = findUnsupportedNextSteps(first);
  diagnostics.attempts.push({
    attemptNumber: 1,
    unsupportedNextSteps: firstUnsupported,
  });
  diagnostics.attemptCount = 1;
  if (firstUnsupported.length === 0) {
    if (qualityDiagnostics) qualityDiagnostics.value = diagnostics;
    return first;
  }

  diagnostics.retryCategory = "unsupported_next_steps";
  const second = await generateAttempt(firstUnsupported);
  const secondUnsupported = findUnsupportedNextSteps(second);
  diagnostics.attempts.push({
    attemptNumber: 2,
    unsupportedNextSteps: secondUnsupported,
  });
  diagnostics.attemptCount = 2;
  if (qualityDiagnostics) qualityDiagnostics.value = diagnostics;
  if (secondUnsupported.length > 0) {
    throw new CaptureLayerNextStepQualityError(secondUnsupported, diagnostics);
  }
  return second;
}

export { formatLongInputProgressMessage };
