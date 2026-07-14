import type { CaptureLayer } from "../../../types/captureLayer";
import { LongInputMergeFailureError } from "./longInputErrors";
import type {
  EvidenceReference,
  MergeCaptureSignalsInput,
  PartialCaptureSignals,
  SignalConflict,
  UnresolvedReference,
} from "./types";

function normalizeComparable(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const key = normalizeComparable(trimmed);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function isMateriallyDifferent(a: string, b: string): boolean {
  const normalizedA = normalizeComparable(a);
  const normalizedB = normalizeComparable(b);

  if (normalizedA === normalizedB) {
    return false;
  }

  if (
    normalizedA.includes(normalizedB) ||
    normalizedB.includes(normalizedA)
  ) {
    return false;
  }

  return true;
}

function dedupeEvidence(references: EvidenceReference[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const reference of references) {
    const trimmed = reference.text.trim();
    if (!trimmed) {
      continue;
    }

    const key = normalizeComparable(trimmed);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function mergeConflicts(conflicts: SignalConflict[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const conflict of conflicts) {
    const line = `${conflict.topic}: ${conflict.statementA} vs ${conflict.statementB}`;
    const key = normalizeComparable(line);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(line.trim());
  }

  return merged;
}

function mergeUnresolvedReferences(
  references: UnresolvedReference[],
): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const reference of references) {
    const line = `${reference.term}: ${reference.note}`;
    const key = normalizeComparable(reference.term);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(line.trim());
  }

  return merged;
}

function collectField(
  partialResults: PartialCaptureSignals[],
  field: keyof Pick<
    PartialCaptureSignals,
    | "goals"
    | "stakeholders"
    | "options_considered"
    | "constraints"
    | "risks"
    | "assumptions"
    | "open_questions"
    | "tensions"
    | "missing_context"
    | "suggested_next_steps"
  >,
): string[] {
  return dedupeStrings(
    partialResults.flatMap((partial) => partial[field] ?? []),
  );
}

function mergeScalarField(
  partialResults: PartialCaptureSignals[],
  field: "decision_context" | "implied_decision" | "recommendation_candidate",
): string {
  const values = dedupeStrings(
    partialResults
      .map((partial) => partial[field] ?? "")
      .filter((value) => value.trim().length > 0),
  );

  return values.join(" ");
}

function resolveConfidence(
  partialResults: PartialCaptureSignals[],
): CaptureLayer["confidence"] {
  const values = partialResults
    .map((partial) => partial.confidence)
    .filter((value): value is CaptureLayer["confidence"] => Boolean(value));

  if (values.includes("Low")) {
    return "Low";
  }

  if (values.includes("Medium")) {
    return "Medium";
  }

  if (values.includes("High")) {
    return "High";
  }

  return "Medium";
}

function summarizeSource(fullSourceText: string): string {
  const normalized = fullSourceText.trim().replace(/\s+/g, " ");
  if (normalized.length <= 220) {
    return normalized;
  }

  return `${normalized.slice(0, 217)}...`;
}

export function mergePartialCaptureSignals(
  input: MergeCaptureSignalsInput,
): CaptureLayer {
  const { partialResults, fullSourceText } = input;

  if (partialResults.length === 0) {
    throw new LongInputMergeFailureError(
      "Cannot merge an empty set of chunk signals.",
    );
  }

  const evidenceReferences = partialResults.flatMap(
    (partial) => partial.evidence,
  );
  const conflicts = partialResults.flatMap((partial) => partial.conflicts);
  const unresolvedReferences = partialResults.flatMap(
    (partial) => partial.unresolved_references,
  );
  const tensions = [
    ...collectField(partialResults, "tensions"),
    ...mergeConflicts(conflicts),
  ];

  const statedDecisionValues = dedupeStrings(
    partialResults
      .map((partial) => partial.stated_decision ?? "")
      .filter((value) => value.trim().length > 0),
  );

  const missingContext = dedupeStrings([
    ...collectField(partialResults, "missing_context"),
    ...mergeUnresolvedReferences(unresolvedReferences),
  ]);

  const captureLayer: CaptureLayer = {
    source_summary: summarizeSource(fullSourceText),
    decision_context: mergeScalarField(partialResults, "decision_context"),
    stated_decision: statedDecisionValues.join(" "),
    implied_decision: mergeScalarField(partialResults, "implied_decision"),
    goals: collectField(partialResults, "goals"),
    stakeholders: collectField(partialResults, "stakeholders"),
    options_considered: collectField(partialResults, "options_considered"),
    constraints: collectField(partialResults, "constraints"),
    risks: collectField(partialResults, "risks"),
    assumptions: collectField(partialResults, "assumptions"),
    evidence: dedupeEvidence(evidenceReferences),
    open_questions: collectField(partialResults, "open_questions"),
    tensions: dedupeStrings(tensions),
    recommendation_candidate: mergeScalarField(
      partialResults,
      "recommendation_candidate",
    ),
    confidence: resolveConfidence(partialResults),
    missing_context: missingContext,
    suggested_next_steps: collectField(
      partialResults,
      "suggested_next_steps",
    ),
  };

  if (!captureLayer.implied_decision.trim() && !captureLayer.stated_decision.trim()) {
    throw new LongInputMergeFailureError(
      "Merged Capture Layer is missing both stated and implied decision signals.",
    );
  }

  const materiallyDifferentEvidence = captureLayer.evidence.filter((item, index, all) =>
    all.some(
      (other, otherIndex) =>
        otherIndex !== index && isMateriallyDifferent(item, other),
    ),
  );

  if (materiallyDifferentEvidence.length === 0 && captureLayer.evidence.length < 2) {
    throw new LongInputMergeFailureError(
      "Merged Capture Layer is missing preserved evidence signals.",
    );
  }

  return captureLayer;
}
