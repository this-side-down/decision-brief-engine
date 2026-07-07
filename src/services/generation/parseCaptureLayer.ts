import type { CaptureLayer, Confidence } from "../../types/captureLayer";
import { CAPTURE_LAYER_FIELDS } from "./types";

const CONFIDENCE_VALUES = new Set<Confidence>(["High", "Medium", "Low"]);

const STRING_FIELDS = [
  "source_summary",
  "decision_context",
  "stated_decision",
  "implied_decision",
  "recommendation_candidate",
] as const;

const ARRAY_FIELDS = [
  "goals",
  "stakeholders",
  "options_considered",
  "constraints",
  "risks",
  "assumptions",
  "evidence",
  "open_questions",
  "tensions",
  "missing_context",
  "suggested_next_steps",
] as const;

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);

  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  return trimmed;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseCaptureLayerJson(jsonText: string): CaptureLayer {
  const stripped = stripJsonFences(jsonText.trim());

  let parsed: unknown;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error("Capture Layer response was not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Capture Layer response must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;

  for (const field of CAPTURE_LAYER_FIELDS) {
    if (!(field in record)) {
      throw new Error(`Capture Layer JSON is missing required field: ${field}`);
    }
  }

  for (const field of STRING_FIELDS) {
    if (typeof record[field] !== "string") {
      throw new Error(`Capture Layer field ${field} must be a string.`);
    }
  }

  for (const field of ARRAY_FIELDS) {
    if (!isStringArray(record[field])) {
      throw new Error(`Capture Layer field ${field} must be an array of strings.`);
    }
  }

  const confidence = record.confidence;

  if (
    typeof confidence !== "string" ||
    !CONFIDENCE_VALUES.has(confidence as Confidence)
  ) {
    throw new Error(
      'Capture Layer field confidence must be "High", "Medium", or "Low".',
    );
  }

  return record as CaptureLayer;
}
