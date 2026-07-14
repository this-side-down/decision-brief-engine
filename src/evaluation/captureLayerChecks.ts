import type { CaptureLayer } from "../types/captureLayer";
import { parseCaptureLayerJson } from "../services/generation/parseCaptureLayer";
import {
  evaluateStructuralReadiness,
  type StructuralCheck,
  type StructuralExpectation,
  type StructuralReadinessResult,
} from "../services/generation/captureLayerStructuralReadiness";
import type { SchemaCheckResult } from "./types";

export {
  evaluateStructuralReadiness,
  GENERIC_MOCK_STRUCTURAL_EXPECTATIONS,
  STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS,
} from "../services/generation/captureLayerStructuralReadiness";
export type {
  StructuralCheck,
  StructuralExpectation,
  StructuralReadinessResult,
} from "../services/generation/captureLayerStructuralReadiness";

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/**
 * Schema gate used before any product-quality judgment.
 * Prefer validating a CaptureLayer object already returned by an adapter;
 * use validateCaptureLayerJsonText when only raw model text is available.
 */
export function validateCaptureLayerJsonText(
  jsonText: string,
): SchemaCheckResult & { captureLayer: CaptureLayer | null } {
  const stripped = stripJsonFences(jsonText);

  try {
    JSON.parse(stripped);
  } catch {
    return {
      validJson: false,
      schemaPass: false,
      error: "Capture Layer response was not valid JSON.",
      captureLayer: null,
    };
  }

  try {
    const captureLayer = parseCaptureLayerJson(jsonText);
    return {
      validJson: true,
      schemaPass: true,
      error: null,
      captureLayer,
    };
  } catch (error) {
    return {
      validJson: true,
      schemaPass: false,
      error: error instanceof Error ? error.message : String(error),
      captureLayer: null,
    };
  }
}

export function validateCaptureLayerObject(
  value: unknown,
): SchemaCheckResult & { captureLayer: CaptureLayer | null } {
  try {
    return validateCaptureLayerJsonText(JSON.stringify(value));
  } catch (error) {
    return {
      validJson: false,
      schemaPass: false,
      error: error instanceof Error ? error.message : String(error),
      captureLayer: null,
    };
  }
}

/**
 * Automated proceed-to-brief gate used by the harness.
 * Schema validity is required before structural readiness is considered.
 */
export function decideProceedToBrief(options: {
  schemaPass: boolean;
  structuralPass: boolean;
}): boolean {
  return options.schemaPass && options.structuralPass;
}
