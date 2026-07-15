const NO_DECISION_PATTERN =
  /\b(?:no (?:explicit |stated |final |architecture )*decision|not (?:yet )?decided|(?:has|have|had|was|were) not (?:yet )?decided|decision (?:remains|is) (?:open|pending|undecided))\b/i;

const NON_COMMITTAL_FRAMING_PATTERN =
  /\b(?:recommendation(?: candidate)?\s*:|(?:we|i|the team) recommend\b|(?:we|i|the team) prefer\b|preference\s*:|proposal\s*:|(?:we|i|the team) propose\b|(?:we|i|the team) suggest\b|tentatively? (?:aligned|agree|decided|committed)|leaning (?:toward|towards|to)|can live with|pushing for|would like|(?:we|the team) should\b|(?:we|the team) could\b|(?:we|the team) might\b)/i;

const AFFIRMATIVE_DECISION_PATTERN =
  /(?:\b(?:final decision|decision for the record|decision captured|(?:we|the (?:team|group|committee|board)) (?:decided|approved|committed|agreed|resolved|selected|chose|are proceeding|will proceed)|(?:has|have|had) (?:decided|approved|committed|agreed|resolved|selected|chosen)|(?:is|was) approved|committed to)\b|\bdecision\s*:)/i;

const NEGATIVE_ACTION_PATTERN = /\b(?:not|don't|do not|won't|will not)\b/i;
const DECISION_ACTION_TOKENS = new Set([
  "adopt", "choose", "chosen", "launch", "proceed", "select", "selected", "use",
]);

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "decision", "for",
  "from", "has", "have", "in", "is", "it", "of", "on", "or", "our",
  "agreed", "approved", "board", "captured", "chose", "committee", "committed",
  "decided", "final", "group", "record", "resolved", "selected", "team", "that",
  "the", "this", "to", "was", "we", "were", "will", "with",
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

function candidateMatchesStatement(candidate: string, statement: string): boolean {
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

function isNonCommittalFraming(statement: string): boolean {
  if (!NON_COMMITTAL_FRAMING_PATTERN.test(statement)) {
    return false;
  }

  const hasAffirmativeDecision = AFFIRMATIVE_DECISION_PATTERN.test(statement);
  const explicitlyTentativeCommitment =
    /\btentatively? (?:agreed|decided|committed|resolved|selected|chose)\b/i.test(
      statement,
    );
  return !hasAffirmativeDecision || explicitlyTentativeCommitment;
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
    isNonCommittalFraming(trimmed)
  ) {
    return "";
  }

  const groundedAffirmativeStatement = sourceStatements(chunkText).find(
    (statement) =>
      !NO_DECISION_PATTERN.test(statement) &&
      !isNonCommittalFraming(statement) &&
      AFFIRMATIVE_DECISION_PATTERN.test(statement) &&
      candidateMatchesStatement(trimmed, statement),
  );

  return groundedAffirmativeStatement ?? "";
}

export function areCompatibleRepeatedDecisions(a: string, b: string): boolean {
  const aTokens = contentTokens(a);
  const bTokens = contentTokens(b);
  return (
    aTokens.size === bTokens.size &&
    [...aTokens].every((token) => bTokens.has(token))
  );
}

export function areDirectlyConflictingDecisions(a: string, b: string): boolean {
  const aTokens = contentTokens(a);
  const bTokens = contentTokens(b);
  const aNegative = NEGATIVE_ACTION_PATTERN.test(a);
  const bNegative = NEGATIVE_ACTION_PATTERN.test(b);
  const aComparable = new Set([...aTokens].filter((token) => token !== "not" && token !== "do"));
  const bComparable = new Set([...bTokens].filter((token) => token !== "not" && token !== "do"));
  const shared = [...aComparable].filter((token) => bComparable.has(token));
  if (aNegative !== bNegative) {
    const smallerSize = Math.min(aComparable.size, bComparable.size);
    return smallerSize > 0 && shared.length / smallerSize >= 0.5;
  }

  const sharedAction = shared.some((token) => DECISION_ACTION_TOKENS.has(token));
  const aOnly = [...aComparable].filter((token) => !bComparable.has(token));
  const bOnly = [...bComparable].filter((token) => !aComparable.has(token));
  if (
    sharedAction &&
    aComparable.size <= 3 &&
    bComparable.size <= 3 &&
    aOnly.length === 1 &&
    bOnly.length === 1
  ) {
    return true;
  }

  return false;
}
