import type { Confidence } from "../../types/captureLayer";
import type {
  DecisionTrace,
  DecisionTraceBasis,
  DecisionTraceEntry,
  DecisionTraceEntryKind,
} from "../../types/decisionTrace";

const CONFIDENCE_VALUES = new Set<Confidence>(["High", "Medium", "Low"]);
const ENTRY_KIND_VALUES = new Set<DecisionTraceEntryKind>(["recommendation", "next_step"]);

const BASIS_ARRAY_FIELDS = [
  "supporting_evidence",
  "assumptions_relied_on",
  "risks_addressed",
  "risks_accepted",
  "constraints_respected",
  "tradeoffs",
  "alternatives_considered",
  "missing_context_caveats",
] as const;

/**
 * Patterns that indicate a would_change_if condition is too generic to be useful.
 * Conditions matching any of these are rejected by validation.
 */
const GENERIC_WOULD_CHANGE_IF_PATTERNS: RegExp[] = [
  /^if (the )?situation changes?\.?$/i,
  /^if new information (becomes?|is) available\.?$/i,
  /^if circumstances? changes?\.?$/i,
  /^if (the )?context changes?\.?$/i,
  /^if (anything|something) changes?\.?$/i,
  /^if (the )?facts? changes?\.?$/i,
  /^circumstances? changes?\.?$/i,
  /^new information becomes? available\.?$/i,
  /^if (the )?(situation|context|circumstances?) (is|are) different\.?$/i,
];

function isGenericWouldChangeIf(value: string): boolean {
  const trimmed = value.trim();
  return GENERIC_WOULD_CHANGE_IF_PATTERNS.some((p) => p.test(trimmed));
}

export function stripDecisionTraceJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateBasis(raw: unknown, entryIndex: number): DecisionTraceBasis {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Decision Trace entry[${entryIndex}].basis must be an object.`);
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.intent !== "string") {
    throw new Error(`Decision Trace entry[${entryIndex}].basis.intent must be a string.`);
  }

  if (!record.intent.trim()) {
    throw new Error(
      `Decision Trace entry[${entryIndex}].basis.intent must not be empty.`,
    );
  }

  for (const field of BASIS_ARRAY_FIELDS) {
    if (!isStringArray(record[field])) {
      throw new Error(
        `Decision Trace entry[${entryIndex}].basis.${field} must be an array of strings.`,
      );
    }
  }

  const allArraysEmpty = BASIS_ARRAY_FIELDS.every(
    (field) => (record[field] as string[]).length === 0,
  );

  if (allArraysEmpty) {
    throw new Error(
      `Decision Trace entry[${entryIndex}].basis must have at least one non-empty array field.`,
    );
  }

  return {
    intent: record.intent,
    supporting_evidence: record.supporting_evidence as string[],
    assumptions_relied_on: record.assumptions_relied_on as string[],
    risks_addressed: record.risks_addressed as string[],
    risks_accepted: record.risks_accepted as string[],
    constraints_respected: record.constraints_respected as string[],
    tradeoffs: record.tradeoffs as string[],
    alternatives_considered: record.alternatives_considered as string[],
    missing_context_caveats: record.missing_context_caveats as string[],
  };
}

function validateEntry(raw: unknown, index: number): DecisionTraceEntry {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Decision Trace entries[${index}] must be an object.`);
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.statement !== "string") {
    throw new Error(`Decision Trace entries[${index}].statement must be a string.`);
  }

  if (!record.statement.trim()) {
    throw new Error(`Decision Trace entries[${index}].statement must not be empty.`);
  }

  if (!ENTRY_KIND_VALUES.has(record.kind as DecisionTraceEntryKind)) {
    throw new Error(
      `Decision Trace entries[${index}].kind must be "recommendation" or "next_step".`,
    );
  }

  const basis = validateBasis(record.basis, index);

  if (!CONFIDENCE_VALUES.has(record.confidence as Confidence)) {
    throw new Error(
      `Decision Trace entries[${index}].confidence must be "High", "Medium", or "Low".`,
    );
  }

  if (!isStringArray(record.would_change_if)) {
    throw new Error(
      `Decision Trace entries[${index}].would_change_if must be an array of strings.`,
    );
  }

  const wouldChangeIf = record.would_change_if as string[];

  if (wouldChangeIf.length === 0) {
    throw new Error(
      `Decision Trace entries[${index}].would_change_if must not be empty.`,
    );
  }

  const emptyCondition = wouldChangeIf.find((v) => !v.trim());
  if (emptyCondition !== undefined) {
    throw new Error(
      `Decision Trace entries[${index}].would_change_if contains an empty condition.`,
    );
  }

  const genericCondition = wouldChangeIf.find((v) => isGenericWouldChangeIf(v));
  if (genericCondition !== undefined) {
    throw new Error(
      `Decision Trace entries[${index}].would_change_if contains a generic or useless condition: "${genericCondition}".`,
    );
  }

  return {
    statement: record.statement,
    kind: record.kind as DecisionTraceEntryKind,
    basis,
    confidence: record.confidence as Confidence,
    would_change_if: wouldChangeIf,
  };
}

/**
 * Validates a plain JS value as a DecisionTrace object.
 * Used when the outer JSON has already been parsed (e.g. from a combined brief envelope).
 */
export function validateDecisionTraceObject(obj: unknown): DecisionTrace {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("Decision Trace must be a JSON object.");
  }

  const record = obj as Record<string, unknown>;

  if (!Array.isArray(record.entries)) {
    throw new Error("Decision Trace JSON is missing required field: entries");
  }

  const entries = (record.entries as unknown[]).map((entry, index) =>
    validateEntry(entry, index),
  );

  const createdAt =
    typeof record.created_at === "string" && record.created_at
      ? record.created_at
      : new Date().toISOString();

  return { entries, created_at: createdAt };
}

/**
 * Parses and validates a Decision Trace from a raw JSON string.
 * Strips markdown code fences before parsing.
 */
export function parseDecisionTraceJson(jsonText: string): DecisionTrace {
  const stripped = stripDecisionTraceJsonFences(jsonText.trim());

  let parsed: unknown;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error("Decision Trace response was not valid JSON.");
  }

  return validateDecisionTraceObject(parsed);
}
