import type { CaptureLayer } from "../../../types/captureLayer";
import type { StructuralExpectation } from "../captureLayerStructuralReadiness";
import { parseCaptureLayerJson } from "../parseCaptureLayer";
import {
  evaluateStructuralReadiness,
  formatStructuralReadinessFailures,
} from "../captureLayerStructuralReadiness";
import { GenerationCancelledError } from "../webGpuErrors";
import type { GenerateCaptureLayerInput } from "../types";
import { resolveCapturePath } from "./inputBudgetPolicy";
import { normalizeSourceText } from "./normalizeSourceText";
import {
  LongInputChunkFailureError,
  LongInputMergeFailureError,
  LongInputSupersededError,
} from "./longInputErrors";
import { mergePartialCaptureSignals } from "./mergePartialSignals";
import { planLongInput } from "./planLongInput";
import { validateSourceCoverage } from "./segmentSource";
import type {
  LongInputCaptureCapability,
  LongInputCaptureResult,
  LongInputProgressState,
  PartialCaptureSignals,
} from "./types";

export type RunLongInputCaptureOptions = {
  input: GenerateCaptureLayerInput;
  capability: LongInputCaptureCapability;
  signal?: AbortSignal;
  runId?: number;
  activeRunId?: number;
  onProgress?: (progress: LongInputProgressState) => void;
  interChunkDelayMs?: number;
  failChunkIds?: ReadonlySet<string>;
};

function assertRunActive(options: RunLongInputCaptureOptions): void {
  if (
    options.activeRunId !== undefined &&
    options.runId !== undefined &&
    options.activeRunId !== options.runId
  ) {
    throw new LongInputSupersededError();
  }

  if (options.signal?.aborted) {
    throw new GenerationCancelledError();
  }
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function assertMergedCaptureLayerReadiness(
  captureLayer: CaptureLayer,
  expectations: StructuralExpectation,
): void {
  const readiness = evaluateStructuralReadiness(captureLayer, expectations);

  if (!readiness.pass) {
    throw new LongInputMergeFailureError(
      `Merged Capture Layer failed structural readiness: ${formatStructuralReadinessFailures(readiness)}`,
    );
  }
}

function computeCoveredSourceLength(chunks: { sourceRange: { start: number; end: number } }[]): number {
  return chunks.reduce(
    (total, chunk) => total + (chunk.sourceRange.end - chunk.sourceRange.start),
    0,
  );
}

export async function runLongInputCapture(
  options: RunLongInputCaptureOptions,
): Promise<LongInputCaptureResult> {
  const { input, capability } = options;
  const rawInputText = normalizeSourceText(input.rawInputText);

  if (!rawInputText) {
    throw new Error("Raw input is required to generate a Capture Layer.");
  }

  if (resolveCapturePath(rawInputText) !== "hierarchical") {
    throw new Error("Long-input capture was requested for a single-pass input.");
  }

  options.onProgress?.({ phase: "preparing" });
  assertRunActive(options);

  const planningStarted = Date.now();
  const plan = planLongInput(rawInputText);
  const planningLatencyMs = Date.now() - planningStarted;
  const coverage = validateSourceCoverage(rawInputText, plan.chunks);
  const partialResults: PartialCaptureSignals[] = [];
  const chunkRetryCounts: Record<string, number> = {};
  let totalChunkRetries = 0;

  const chunkExtractionStarted = Date.now();

  for (const chunk of plan.chunks) {
    assertRunActive(options);

    options.onProgress?.({
      phase: "processing_chunk",
      chunkIndex: chunk.index + 1,
      chunkCount: plan.chunks.length,
    });

    if (options.failChunkIds?.has(chunk.id)) {
      throw new LongInputChunkFailureError(
        chunk.id,
        `Chunk extraction failed for ${chunk.id}.`,
      );
    }

    try {
      const extraction = await capability.extractChunkSignals({
        chunk,
        briefType: input.briefType,
        sourceLabel: input.sourceLabel,
        fullSourceText: rawInputText,
        chunkCount: plan.chunks.length,
        signal: options.signal,
        captureQualityRetryFeedback: input.captureQualityRetryFeedback,
      });
      partialResults.push(extraction.signals);
      chunkRetryCounts[chunk.id] = extraction.retryCount;
      totalChunkRetries += extraction.retryCount;
    } catch (error) {
      if (error instanceof GenerationCancelledError) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : `Chunk extraction failed for ${chunk.id}.`;
      throw new LongInputChunkFailureError(chunk.id, message);
    }

    await delay(options.interChunkDelayMs ?? 0);
  }

  const chunkExtractionLatencyMs = Date.now() - chunkExtractionStarted;

  assertRunActive(options);
  options.onProgress?.({ phase: "merging" });

  const mergeStarted = Date.now();
  let captureLayer: CaptureLayer;
  try {
    captureLayer = mergePartialCaptureSignals({
      plan,
      partialResults,
      briefType: input.briefType,
      fullSourceText: rawInputText,
    });
  } catch (error) {
    if (error instanceof LongInputMergeFailureError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Capture Layer merge failed.";
    throw new LongInputMergeFailureError(message);
  }
  const mergeLatencyMs = Date.now() - mergeStarted;

  assertRunActive(options);
  options.onProgress?.({ phase: "validating" });

  const validationStarted = Date.now();
  let validatedCaptureLayer: CaptureLayer;
  try {
    validatedCaptureLayer = parseCaptureLayerJson(JSON.stringify(captureLayer));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Merged Capture Layer failed validation.";
    throw new LongInputMergeFailureError(message);
  }

  assertMergedCaptureLayerReadiness(
    validatedCaptureLayer,
    capability.resolveStructuralExpectations(input.sourceLabel),
  );
  const validationLatencyMs = Date.now() - validationStarted;

  return {
    captureLayer: validatedCaptureLayer,
    diagnostics: {
      strategy: "hierarchical",
      chunkCount: plan.chunks.length,
      sourceCoverageComplete: coverage.complete,
      totalSourceLength: plan.totalSourceLength,
      coveredSourceLength: computeCoveredSourceLength(plan.chunks),
      chunkRetryCounts,
      totalChunkRetries,
      planningLatencyMs,
      chunkExtractionLatencyMs,
      mergeLatencyMs,
      validationLatencyMs,
    },
  };
}

export { validateSourceCoverage };
