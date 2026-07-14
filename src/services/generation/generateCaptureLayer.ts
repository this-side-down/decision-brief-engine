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
}: GenerateCaptureLayerForSessionInput): Promise<CaptureLayer> {
  const captureInput = {
    rawInputText,
    briefType,
    briefTypeGuidance: briefType.guidance,
    captureLayerFields: [...CAPTURE_LAYER_FIELDS],
    sourceLabel,
  };

  if (resolveCapturePath(rawInputText) === "hierarchical") {
    const capability = getLongInputCaptureCapability(mode);
    if (capability) {
      const result = await runLongInputCapture({
        input: captureInput,
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

  if (longInputDiagnostics) {
    longInputDiagnostics.value = null;
  }

  return adapter.generateCaptureLayer(captureInput);
}

export { formatLongInputProgressMessage };
