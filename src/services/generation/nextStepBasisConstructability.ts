import type { CaptureLayer } from "../../types/captureLayer";

export const NEXT_STEP_BASIS_CAPTURE_FIELDS = [
  "evidence",
  "assumptions",
  "risks",
  "constraints",
  "tensions",
  "options_considered",
  "missing_context",
] as const satisfies readonly (keyof CaptureLayer)[];

export type NextStepBasisCaptureField =
  (typeof NEXT_STEP_BASIS_CAPTURE_FIELDS)[number];

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "of", "to", "in", "on", "for",
  "with", "is", "are", "was", "were", "be", "been", "being", "this", "that",
  "these", "those", "it", "its", "as", "at", "by", "from", "into", "than", "then",
  "so", "not", "no", "will", "would", "should", "could", "can", "may", "might",
  "must", "we", "our", "their", "they", "which", "who", "what", "when", "where",
  "how", "do", "does", "did", "has", "have", "had",
]);

// Process vocabulary cannot independently make an action source-grounded.
const GENERIC_NEXT_STEP_TERMS = new Set([
  "meet", "meeting", "meetings", "updated", "update", "updates", "context", "review", "reviews",
  "decision", "decisions", "plan", "plans", "planning", "next", "follow", "following",
  "revisit", "workforce", "allocation",
]);

const SCHEDULE_EVENT_TERMS = new Set([
  "meeting", "review", "call", "deadline", "date", "friday", "thursday", "monday",
  "tuesday", "wednesday", "saturday", "sunday", "monthly", "weekly", "quarterly",
]);

function normalizeToken(token: string): string {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("s") && token.length > 4 && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function tokens(text: string, includeGeneric: boolean): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map(normalizeToken)
      .filter((token) =>
        token.length > 2 &&
        !STOPWORDS.has(token) &&
        (includeGeneric || !GENERIC_NEXT_STEP_TERMS.has(token))),
  );
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const token of a) if (b.has(token)) return true;
  return false;
}

function hasScheduledCheckpointRelationship(step: string, basis: string): boolean {
  const stepAll = tokens(step, true);
  const basisAll = tokens(basis, true);
  const stepSubjects = tokens(step, false);
  const basisSubjects = tokens(basis, false);
  const sharedCheckpointTerm = [...stepAll].some(
    (token) => SCHEDULE_EVENT_TERMS.has(token) && basisAll.has(token),
  );

  if (overlaps(stepSubjects, basisSubjects) && sharedCheckpointTerm) {
    return true;
  }

  // Workforce planning meetings and staffing reviews are two names for the
  // same recurring staffing checkpoint. Keep this deliberately narrow: both
  // domain phrases and their respective event nouns must be present.
  return (
    stepAll.has("workforce") &&
    stepAll.has("planning") &&
    stepAll.has("meeting") &&
    basisAll.has("staffing") &&
    basisAll.has("review")
  );
}

export type NextStepBasisMatch = {
  field: NextStepBasisCaptureField;
  item: string;
};

export function findConstructableNextStepBasis(
  step: string,
  captureLayer: CaptureLayer,
): NextStepBasisMatch[] {
  const stepTokens = tokens(step, false);
  const matches: NextStepBasisMatch[] = [];

  for (const field of NEXT_STEP_BASIS_CAPTURE_FIELDS) {
    for (const item of captureLayer[field] as string[]) {
      if (!item.trim()) continue;
      if (
        overlaps(stepTokens, tokens(item, false)) ||
        (field === "constraints" && hasScheduledCheckpointRelationship(step, item))
      ) {
        matches.push({ field, item });
      }
    }
  }

  return matches;
}

export function findUnsupportedNextSteps(captureLayer: CaptureLayer): string[] {
  return captureLayer.suggested_next_steps.filter(
    (step) => !step.trim() || findConstructableNextStepBasis(step, captureLayer).length === 0,
  );
}
