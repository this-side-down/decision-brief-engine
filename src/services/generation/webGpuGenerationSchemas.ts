import type { ResponseFormat } from "@mlc-ai/web-llm";
import { CAPTURE_LAYER_FIELDS } from "./types";

/** Telemetry identifier for the Capture Layer WebLLM output schema. */
export const WEBGPU_CAPTURE_LAYER_SCHEMA_VERSION = "capture-layer-v1";

/** Telemetry identifier for the Decision Brief result envelope WebLLM output schema. */
export const WEBGPU_DECISION_BRIEF_RESULT_SCHEMA_VERSION =
  "decision-brief-result-v1";

/** Evaluation-only markdown-only Decision Brief schema (#141 experiment). */
export const WEBGPU_DECISION_BRIEF_MARKDOWN_ONLY_SCHEMA_VERSION =
  "decision-brief-markdown-only-v1";

/** Installed @mlc-ai/web-llm version used for evaluation comparison. */
export const WEB_LLM_PACKAGE_VERSION = "0.2.84";

const CONFIDENCE_ENUM = ["High", "Medium", "Low"] as const;
const DECISION_TRACE_ENTRY_KIND_ENUM = ["recommendation", "next_step"] as const;

const STRING_ARRAY_SCHEMA = {
  type: "array",
  items: { type: "string" },
} as const;

const DECISION_TRACE_BASIS_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string" },
    supporting_evidence: STRING_ARRAY_SCHEMA,
    assumptions_relied_on: STRING_ARRAY_SCHEMA,
    risks_addressed: STRING_ARRAY_SCHEMA,
    risks_accepted: STRING_ARRAY_SCHEMA,
    constraints_respected: STRING_ARRAY_SCHEMA,
    tradeoffs: STRING_ARRAY_SCHEMA,
    alternatives_considered: STRING_ARRAY_SCHEMA,
    missing_context_caveats: STRING_ARRAY_SCHEMA,
  },
  required: [
    "intent",
    "supporting_evidence",
    "assumptions_relied_on",
    "risks_addressed",
    "risks_accepted",
    "constraints_respected",
    "tradeoffs",
    "alternatives_considered",
    "missing_context_caveats",
  ],
} as const;

const DECISION_TRACE_ENTRY_SCHEMA = {
  type: "object",
  properties: {
    statement: { type: "string" },
    kind: { type: "string", enum: [...DECISION_TRACE_ENTRY_KIND_ENUM] },
    basis: DECISION_TRACE_BASIS_SCHEMA,
    confidence: { type: "string", enum: [...CONFIDENCE_ENUM] },
    would_change_if: STRING_ARRAY_SCHEMA,
  },
  required: ["statement", "kind", "basis", "confidence", "would_change_if"],
} as const;

const CAPTURE_LAYER_STRING_FIELDS = [
  "source_summary",
  "decision_context",
  "stated_decision",
  "implied_decision",
  "recommendation_candidate",
] as const;

const CAPTURE_LAYER_ARRAY_FIELDS = [
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

/** JSON Schema object matching the CaptureLayer contract. */
export const CAPTURE_LAYER_JSON_SCHEMA = {
  type: "object",
  properties: {
    ...Object.fromEntries(
      CAPTURE_LAYER_STRING_FIELDS.map((field) => [field, { type: "string" }]),
    ),
    ...Object.fromEntries(
      CAPTURE_LAYER_ARRAY_FIELDS.map((field) => [field, STRING_ARRAY_SCHEMA]),
    ),
    confidence: { type: "string", enum: [...CONFIDENCE_ENUM] },
  },
  required: [...CAPTURE_LAYER_FIELDS],
} as const;

/** JSON Schema object matching the combined Decision Brief result envelope. */
export const DECISION_BRIEF_RESULT_JSON_SCHEMA = {
  type: "object",
  properties: {
    markdown: { type: "string" },
    decisionTrace: {
      type: "object",
      properties: {
        entries: {
          type: "array",
          items: DECISION_TRACE_ENTRY_SCHEMA,
        },
        created_at: { type: "string" },
      },
      required: ["entries", "created_at"],
    },
  },
  required: ["markdown", "decisionTrace"],
} as const;

/** Evaluation-only schema: Markdown Decision Brief without Decision Trace. */
export const DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA = {
  type: "object",
  properties: {
    markdown: { type: "string" },
  },
  required: ["markdown"],
} as const;

export const CAPTURE_LAYER_RESPONSE_SCHEMA_JSON = JSON.stringify(
  CAPTURE_LAYER_JSON_SCHEMA,
);

export const DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON = JSON.stringify(
  DECISION_BRIEF_RESULT_JSON_SCHEMA,
);

export const DECISION_BRIEF_MARKDOWN_ONLY_RESPONSE_SCHEMA_JSON = JSON.stringify(
  DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA,
);

export function buildWebGpuJsonResponseFormat(schemaJson: string): ResponseFormat {
  return {
    type: "json_object",
    schema: schemaJson,
  };
}

export const CAPTURE_LAYER_RESPONSE_FORMAT = buildWebGpuJsonResponseFormat(
  CAPTURE_LAYER_RESPONSE_SCHEMA_JSON,
);

export const DECISION_BRIEF_RESULT_RESPONSE_FORMAT = buildWebGpuJsonResponseFormat(
  DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON,
);

export const DECISION_BRIEF_MARKDOWN_ONLY_RESPONSE_FORMAT =
  buildWebGpuJsonResponseFormat(DECISION_BRIEF_MARKDOWN_ONLY_RESPONSE_SCHEMA_JSON);
