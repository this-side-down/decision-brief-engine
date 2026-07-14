import type { ManualScoreFields, PipelineEvalResult } from "./resultTypes";
import {
  CAPTURE_LAYER_SCHEMA_VERSION,
  DECISION_TRACE_SCHEMA_VERSION,
  PIPELINE_RESULT_FORMAT_VERSION,
} from "./constants";

export function createEmptyManualScores(): ManualScoreFields {
  return {
    decisionUsefulness: null,
    groundingAndTraceability: null,
    clarity: null,
    actionability: null,
    totalScore: null,
    reviewerNotes: null,
    humanUsableBrief: null,
  };
}

export function createBasePipelineResult(
  partial: Omit<
    PipelineEvalResult,
    | "resultFormatVersion"
    | "captureLayerSchemaVersion"
    | "decisionTraceSchemaVersion"
    | "manualScores"
  > & { manualScores?: ManualScoreFields },
): PipelineEvalResult {
  const { manualScores, ...rest } = partial;
  return {
    ...rest,
    resultFormatVersion: PIPELINE_RESULT_FORMAT_VERSION,
    captureLayerSchemaVersion: CAPTURE_LAYER_SCHEMA_VERSION,
    decisionTraceSchemaVersion: DECISION_TRACE_SCHEMA_VERSION,
    manualScores: manualScores ?? createEmptyManualScores(),
  };
}

/**
 * Lightweight parser/validator for committed or imported evaluation records.
 * Evaluation data only — not a product schema.
 */
export function parsePipelineEvalResult(value: unknown): PipelineEvalResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Pipeline eval result must be an object.");
  }

  const record = value as Record<string, unknown>;

  if (record.resultFormatVersion !== PIPELINE_RESULT_FORMAT_VERSION) {
    throw new Error(
      `Unsupported resultFormatVersion: ${String(record.resultFormatVersion)}`,
    );
  }

  if (typeof record.fixtureId !== "string" || !record.fixtureId) {
    throw new Error("Pipeline eval result is missing fixtureId.");
  }

  if (
    record.generationMode !== "mock" &&
    record.generationMode !== "ollama" &&
    record.generationMode !== "webgpu"
  ) {
    throw new Error(`Unsupported generationMode: ${String(record.generationMode)}`);
  }

  if (!record.manualScores || typeof record.manualScores !== "object") {
    throw new Error("Pipeline eval result is missing manualScores.");
  }

  const manual = record.manualScores as Record<string, unknown>;
  for (const key of [
    "decisionUsefulness",
    "groundingAndTraceability",
    "clarity",
    "actionability",
    "totalScore",
    "reviewerNotes",
    "humanUsableBrief",
  ] as const) {
    if (!(key in manual)) {
      throw new Error(`manualScores is missing ${key}`);
    }
  }

  if (typeof record.deterministicUsableBrief !== "boolean") {
    throw new Error("deterministicUsableBrief must be a boolean.");
  }

  return value as PipelineEvalResult;
}

export function parsePipelineRunSummary(value: unknown): {
  resultFormatVersion: number;
  results: PipelineEvalResult[];
  caseIds: string[];
  infrastructureFailure: boolean;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Pipeline run summary must be an object.");
  }

  const record = value as Record<string, unknown>;
  if (record.resultFormatVersion !== PIPELINE_RESULT_FORMAT_VERSION) {
    throw new Error(
      `Unsupported resultFormatVersion: ${String(record.resultFormatVersion)}`,
    );
  }

  if (!Array.isArray(record.results)) {
    throw new Error("Pipeline run summary is missing results[].");
  }

  const results = record.results.map((item) => parsePipelineEvalResult(item));
  const caseIds = Array.isArray(record.caseIds)
    ? record.caseIds.filter((id): id is string => typeof id === "string")
    : results.map((item) => item.fixtureId);

  return {
    resultFormatVersion: PIPELINE_RESULT_FORMAT_VERSION,
    results,
    caseIds,
    infrastructureFailure: record.infrastructureFailure === true,
  };
}
