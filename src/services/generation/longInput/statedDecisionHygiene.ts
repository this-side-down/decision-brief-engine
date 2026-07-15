const NO_DECISION_PATTERN =
  /\b(?:no (?:explicit |stated |final |architecture )*decision|not (?:yet )?decided|(?:has|have|had|was|were) not (?:yet )?decided|decision (?:remains|is) (?:open|pending|undecided))\b/i;

const NON_COMMITTAL_PATTERN =
  /\b(?:recommend(?:ation|ed|s)?|prefer(?:ence|red|s)?|propos(?:al|e|ed|ing)|suggest(?:ion|ed|s)?|tentative(?:ly)?|lean(?:ing|s)?|align(?:ed|ment)|can live with|pushing for|would like|should|could|might|option)\b/i;

const AFFIRMATIVE_DECISION_PATTERN =
  /\b(?:final decision|decision for the record|decision captured|(?:we|the (?:team|group|committee|board)) (?:decided|approved|committed|agreed|resolved|selected|chose|are proceeding|will proceed)|(?:has|have|had) (?:decided|approved|committed|agreed|resolved|selected|chosen)|(?:is|was) approved|committed to|decision\s*:)\b/i;

const NEGATIVE_ACTION_PATTERN = /\b(?:not|don't|do not|won't|will not)\b/i;

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "decision", "for",
  "from", "has", "have", "in", "is", "it", "of", "on", "or", "our",
  "that", "the", "this", "to", "was", "we", "were", "will", "with",
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function contentTokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}

function candidateIsGrounded(candidate: string, statement: string): boolean {
  const normalizedCandidate = normalize(candidate);
  const normalizedStatement = normalize(statement);
  if (
    normalizedStatement.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedStatement)
  ) {
    return true;
  }

  const candidateTokens = contentTokens(candidate);
  if (candidateTokens.size === 0) {
    return false;
  }

  const statementTokens = contentTokens(statement);
  const shared = [...candidateTokens].filter((token) => statementTokens.has(token));
  return shared.length / candidateTokens.size >= 0.6;
}

function sourceStatements(chunkText: string): string[] {
  return chunkText
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((statement) => statement.replace(/^\s*\*\*[^*]+:\*\*\s*/, "").trim())
    .filter(Boolean);
}

export function acceptChunkStatedDecision(
  candidate: string,
  chunkText: string,
): string {
  const trimmed = candidate.trim();
  if (
    !trimmed ||
    NO_DECISION_PATTERN.test(trimmed) ||
    NON_COMMITTAL_PATTERN.test(trimmed)
  ) {
    return "";
  }

  const groundedAffirmativeStatement = sourceStatements(chunkText).find(
    (statement) =>
      !NO_DECISION_PATTERN.test(statement) &&
      !NON_COMMITTAL_PATTERN.test(statement) &&
      AFFIRMATIVE_DECISION_PATTERN.test(statement) &&
      candidateIsGrounded(trimmed, statement),
  );

  return groundedAffirmativeStatement ? trimmed : "";
}

export function areDirectlyConflictingDecisions(a: string, b: string): boolean {
  if (NEGATIVE_ACTION_PATTERN.test(a) === NEGATIVE_ACTION_PATTERN.test(b)) {
    return false;
  }

  const aTokens = contentTokens(a);
  const bTokens = contentTokens(b);
  const shared = [...aTokens].filter((token) => bTokens.has(token));
  const smallerSize = Math.min(aTokens.size, bTokens.size);
  return smallerSize > 0 && shared.length / smallerSize >= 0.5;
}
