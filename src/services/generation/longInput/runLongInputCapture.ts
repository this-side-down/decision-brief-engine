import type { CaptureLayer } from "../../../types/captureLayer";
import { parseCaptureLayerJson } from "../parseCaptureLayer";
import { GenerationCancelledError } from "../webGpuErrors";
import type { GenerateCaptureLayerInput } from "../types";
import { resolveCapturePath } from "./inputBudgetPolicy";
import { normalizeSourceText } from "./segmentSource";
import {
  LongInputChunkFailureError,
  LongInputMergeFailureError,
  LongInputSupersededError,
} from "./longInputErrors";
import { mergePartialCaptureSignals } from "./mergePartialSignals";
import { planLongInput } from "./planLongInput";
import type {
  LongInputCaptureCapability,
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

export async function runLongInputCapture(
  options: RunLongInputCaptureOptions,
): Promise<CaptureLayer> {
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

  const plan = planLongInput(rawInputText);
  const partialResults: PartialCaptureSignals[] = [];

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
      const partial = await capability.extractChunkSignals({
        chunk,
        briefType: input.briefType,
        sourceLabel: input.sourceLabel,
        fullSourceText: rawInputText,
      });
      partialResults.push(partial);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Chunk extraction failed for ${chunk.id}.`;
      throw new LongInputChunkFailureError(chunk.id, message);
    }

    await delay(options.interChunkDelayMs ?? 0);
  }

  assertRunActive(options);
  options.onProgress?.({ phase: "merging" });

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

  assertRunActive(options);
  options.onProgress?.({ phase: "validating" });

  try {
    return parseCaptureLayerJson(JSON.stringify(captureLayer));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Merged Capture Layer failed validation.";
    throw new LongInputMergeFailureError(message);
  }
}
