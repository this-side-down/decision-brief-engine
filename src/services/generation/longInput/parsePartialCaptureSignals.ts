import type { CaptureLayer } from "../../../types/captureLayer";
import { ChunkExtractionContractError } from "./chunkExtractionErrors";
import type {
  ChunkExtractionInput,
  EvidenceReference,
  PartialCaptureSignals,
  SignalConflict,
  UnresolvedReference,
} from "./types";
import { acceptChunkStatedDecision } from "./statedDecisionHygiene";

const CONFIDENCE_VALUES = new Set<CaptureLayer["confidence"]>([
  "High",
  "Medium",
  "Low",
]);

const INSTRUCTIONAL_PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\breplace (?:this|the) value\b/i,
  /\bexample value\b/i,
  /\byour (?:text|content|answer) here\b/i,
  /\binsert (?:here|text)\b/i,
  /\breturn only(?: the)? json(?: object)?\b/i,
  /\buse (?:this|the)(?: exact)? schema\b/i,
  /\bfollow (?:this|the) schema\b/i,
  /\bjson schema\b/i,
  /\bmust be an array of strings\b/i,
  /\bmust be a string\b/i,
];

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

function contractError(message: string): never {
  throw new ChunkExtractionContractError(message);
}

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

function containsInstructionalPlaceholder(value: string): boolean {
  return INSTRUCTIONAL_PLACEHOLDER_PATTERNS.some((pattern) =>
    pattern.test(value),
  );
}

function assertNoPlaceholderStrings(values: string[], fieldName: string): void {
  for (const value of values) {
    if (containsInstructionalPlaceholder(value)) {
      contractError(
        `Chunk extraction field ${fieldName} contains instructional placeholder text.`,
      );
    }
  }
}

function parseConflictObjects(value: unknown): Array<{
  topic: string;
  statementA: string;
  statementB: string;
}> {
  if (!Array.isArray(value)) {
    contractError("Chunk extraction conflicts must be an array.");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      contractError(`Chunk extraction conflict ${index} must be an object.`);
    }

    const record = item as Record<string, unknown>;
    for (const field of ["topic", "statementA", "statementB"] as const) {
      if (typeof record[field] !== "string") {
        contractError(
          `Chunk extraction conflict ${index} field ${field} must be a string.`,
        );
      }
    }

    const conflict = {
      topic: record.topic as string,
      statementA: record.statementA as string,
      statementB: record.statementB as string,
    };
    assertNoPlaceholderStrings(
      [conflict.topic, conflict.statementA, conflict.statementB],
      `conflicts[${index}]`,
    );

    return conflict;
  });
}

function parseUnresolvedReferenceObjects(value: unknown): Array<{
  term: string;
  note: string;
}> {
  if (!Array.isArray(value)) {
    contractError("Chunk extraction unresolved_references must be an array.");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      contractError(
        `Chunk extraction unresolved reference ${index} must be an object.`,
      );
    }

    const record = item as Record<string, unknown>;
    for (const field of ["term", "note"] as const) {
      if (typeof record[field] !== "string") {
        contractError(
          `Chunk extraction unresolved reference ${index} field ${field} must be a string.`,
        );
      }
    }

    const reference = {
      term: record.term as string,
      note: record.note as string,
    };
    assertNoPlaceholderStrings(
      [reference.term, reference.note],
      `unresolved_references[${index}]`,
    );

    return reference;
  });
}

function attachEvidenceMetadata(
  evidenceTexts: string[],
  input: ChunkExtractionInput,
): EvidenceReference[] {
  return evidenceTexts.map((text) => ({
    text,
    sourceChunkId: input.chunk.id,
    sourceRange: input.chunk.sourceRange,
  }));
}

function attachConflictMetadata(
  conflicts: Array<{ topic: string; statementA: string; statementB: string }>,
  chunkId: string,
): SignalConflict[] {
  return conflicts.map((conflict) => ({
    ...conflict,
    sourceChunkIds: [chunkId],
  }));
}

function attachUnresolvedMetadata(
  references: Array<{ term: string; note: string }>,
  chunkId: string,
): UnresolvedReference[] {
  return references.map((reference) => ({
    ...reference,
    sourceChunkId: chunkId,
  }));
}

export function parsePartialCaptureSignalsJson(
  jsonText: string,
  input: ChunkExtractionInput,
): PartialCaptureSignals {
  const stripped = stripJsonFences(jsonText.trim());

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    contractError("Chunk extraction response was not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    contractError("Chunk extraction response must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;

  for (const field of [
    ...STRING_FIELDS,
    ...ARRAY_FIELDS,
    "confidence",
    "conflicts",
    "unresolved_references",
  ]) {
    if (!(field in record)) {
      contractError(`Chunk extraction JSON is missing required field: ${field}`);
    }
  }

  for (const field of STRING_FIELDS) {
    if (typeof record[field] !== "string") {
      contractError(`Chunk extraction field ${field} must be a string.`);
    }
    if (containsInstructionalPlaceholder(record[field] as string)) {
      contractError(
        `Chunk extraction field ${field} contains instructional placeholder text.`,
      );
    }
  }

  for (const field of ARRAY_FIELDS) {
    if (!isStringArray(record[field])) {
      contractError(`Chunk extraction field ${field} must be an array of strings.`);
    }
    assertNoPlaceholderStrings(record[field] as string[], field);
  }

  const confidence = record.confidence;
  if (
    typeof confidence !== "string" ||
    !CONFIDENCE_VALUES.has(confidence as CaptureLayer["confidence"])
  ) {
    contractError(
      'Chunk extraction confidence must be "High", "Medium", or "Low".',
    );
  }

  const conflicts = parseConflictObjects(record.conflicts);
  const unresolvedReferences = parseUnresolvedReferenceObjects(
    record.unresolved_references,
  );

  return {
    chunkId: input.chunk.id,
    sourceRange: input.chunk.sourceRange,
    source_summary: record.source_summary as string,
    decision_context: record.decision_context as string,
    stated_decision: acceptChunkStatedDecision(
      record.stated_decision as string,
      input.chunk.text,
    ),
    implied_decision: record.implied_decision as string,
    goals: record.goals as string[],
    stakeholders: record.stakeholders as string[],
    options_considered: record.options_considered as string[],
    constraints: record.constraints as string[],
    risks: record.risks as string[],
    assumptions: record.assumptions as string[],
    evidence: attachEvidenceMetadata(record.evidence as string[], input),
    open_questions: record.open_questions as string[],
    tensions: record.tensions as string[],
    recommendation_candidate: record.recommendation_candidate as string,
    confidence: confidence as CaptureLayer["confidence"],
    missing_context: record.missing_context as string[],
    suggested_next_steps: record.suggested_next_steps as string[],
    conflicts: attachConflictMetadata(conflicts, input.chunk.id),
    unresolved_references: attachUnresolvedMetadata(
      unresolvedReferences,
      input.chunk.id,
    ),
  };
}
