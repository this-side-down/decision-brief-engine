const CONFIDENCE_ENUM = ["High", "Medium", "Low"] as const;
const DECISION_TRACE_ENTRY_KIND_ENUM = ["recommendation", "next_step"] as const;

const STRING_ARRAY_SCHEMA = {
  type: "array",
  items: { type: "string" },
} as const;

const DECISION_TRACE_BASIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
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
  additionalProperties: false,
  properties: {
    statement: { type: "string" },
    kind: { type: "string", enum: [...DECISION_TRACE_ENTRY_KIND_ENUM] },
    basis: DECISION_TRACE_BASIS_SCHEMA,
    confidence: { type: "string", enum: [...CONFIDENCE_ENUM] },
    would_change_if: STRING_ARRAY_SCHEMA,
  },
  required: ["statement", "kind", "basis", "confidence", "would_change_if"],
} as const;

/**
 * Runtime-neutral JSON Schema for the combined Decision Brief result envelope.
 * Shared by Local Ollama and WebGPU structured generation.
 */
export const DECISION_BRIEF_RESULT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    markdown: { type: "string" },
    decisionTrace: {
      type: "object",
      additionalProperties: false,
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

export const DECISION_BRIEF_RESULT_SCHEMA_JSON = JSON.stringify(
  DECISION_BRIEF_RESULT_JSON_SCHEMA,
);

/** Backward-compatible alias used by WebGPU tests and telemetry. */
export const DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON =
  DECISION_BRIEF_RESULT_SCHEMA_JSON;

/**
 * Runtime-neutral JSON Schema for the Markdown-only Decision Brief response.
 * Used by the Ollama split-stage generator (Stage A) and the WebGPU
 * markdown_only experiment (#141). No runtime-specific (WebGPU) types are
 * referenced here so this schema can be imported directly by any adapter.
 */
export const DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA = {
  type: "object",
  properties: {
    markdown: { type: "string" },
  },
  required: ["markdown"],
} as const;

export const DECISION_BRIEF_MARKDOWN_ONLY_SCHEMA_JSON = JSON.stringify(
  DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA,
);

const REQUIRED_STAGE_A_SECTION_PROPERTIES = {
  summary: { type: "string", description: "One concise paragraph of at most 60 words. Every sentence is at most 35 words." },
  decisionContext: { type: "string", description: "Concise prose. Every sentence is at most 35 words." },
  optionsConsidered: { type: "string", description: "Markdown list with one option per line. Every list item is at most 35 words." },
  recommendation: { type: "string", description: "Recommendation prose. Every sentence is at most 35 words." },
  risksAndConstraints: { type: "string", description: "Markdown list with one risk or constraint per line. Every list item is at most 35 words." },
  openQuestions: { type: "string", description: "Markdown list with one question per line. Every list item is at most 35 words." },
  suggestedNextSteps: { type: "string", description: "Markdown list with one next step per line. Every list item is at most 35 words." },
  confidence: { type: "string", description: "Confidence label and concise explanation. Every sentence is at most 35 words." },
} as const;

/** Ollama-only deterministic Stage A section scaffold (#154). */
export const OLLAMA_STAGE_A_SECTIONS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: REQUIRED_STAGE_A_SECTION_PROPERTIES,
  required: Object.keys(REQUIRED_STAGE_A_SECTION_PROPERTIES),
} as const;

/** Backward-compatible alias matching the prior WebGPU-module export name. */
export const DECISION_BRIEF_MARKDOWN_ONLY_RESPONSE_SCHEMA_JSON =
  DECISION_BRIEF_MARKDOWN_ONLY_SCHEMA_JSON;
