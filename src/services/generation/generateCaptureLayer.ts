import type { BriefType } from "../../types/brief";
import type { CaptureLayer } from "../../types/captureLayer";
import { mockModelAdapter } from "./mockModelAdapter";
import { CAPTURE_LAYER_FIELDS, type ModelAdapter } from "./types";

type GenerateCaptureLayerForSessionInput = {
  rawInputText: string;
  briefType: BriefType;
  sourceLabel?: string;
  adapter?: ModelAdapter;
};

export async function generateCaptureLayerForSession({
  adapter = mockModelAdapter,
  briefType,
  rawInputText,
  sourceLabel,
}: GenerateCaptureLayerForSessionInput): Promise<CaptureLayer> {
  return adapter.generateCaptureLayer({
    rawInputText,
    briefType,
    briefTypeGuidance: briefType.guidance,
    captureLayerFields: [...CAPTURE_LAYER_FIELDS],
    sourceLabel,
  });
}
