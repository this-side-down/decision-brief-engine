import { SENTENCE_ERROR_WORDS } from "../../evaluation/decisionBriefWritingRules";

type LexicalWord = { value: string; start: number; end: number };

const LEXICAL_WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const SENTENCE_END_PATTERN = /[.!?]["')\]]*$/;
const CLAUSE_STARTERS = new Set([
  "although", "and", "but", "however", "provided", "though", "whereas", "while",
]);
const INCOMPLETE_BOUNDARY_WORDS = new Set([
  "a", "an", "and", "as", "at", "for", "if", "in", "of", "or", "the", "to", "with",
]);

function lexicalWords(value: string): LexicalWord[] {
  return [...value.matchAll(LEXICAL_WORD_PATTERN)].map((match) => ({
    value: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

/** Recommendation-only alignment: exact lexical words and order, punctuation-normalized. */
export function recommendationWordsAlign(candidate: string, rendered: string): boolean {
  const sourceWords = lexicalWords(candidate);
  const renderedWords = lexicalWords(rendered);
  if (sourceWords.length === 0 || sourceWords.length !== renderedWords.length) return false;

  return sourceWords.every((sourceWord, index) => {
    const renderedWord = renderedWords[index];
    if (sourceWord.value === renderedWord.value) return true;
    if (sourceWord.value.toLocaleLowerCase() !== renderedWord.value.toLocaleLowerCase()) return false;
    const preceding = rendered.slice(index === 0 ? 0 : renderedWords[index - 1].end, renderedWord.start);
    return index === 0 || /[.!?]["')\]]*\s*$/.test(preceding);
  });
}

function sentenceSpans(tokens: string[]): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let start = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    if (SENTENCE_END_PATTERN.test(tokens[index])) {
      spans.push([start, index + 1]);
      start = index + 1;
    }
  }
  if (start < tokens.length) spans.push([start, tokens.length]);
  return spans;
}

function chooseClauseBoundary(tokens: string[], start: number, end: number): number | null {
  const maximum = Math.min(end - 1, start + SENTENCE_ERROR_WORDS - 1);
  const minimum = start + 7;
  const candidates: Array<{ index: number; priority: number }> = [];
  for (let index = minimum; index <= maximum; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1] ?? "";
    const nextWord = next.match(LEXICAL_WORD_PATTERN)?.[0] ?? "";
    const currentWords = token.match(LEXICAL_WORD_PATTERN) ?? [];
    const currentWord = currentWords[currentWords.length - 1] ?? "";
    if (/[,;:]["')\]]*$/.test(token) && CLAUSE_STARTERS.has(nextWord.toLocaleLowerCase())) {
      candidates.push({ index, priority: 3 });
    } else if (
      CLAUSE_STARTERS.has(nextWord.toLocaleLowerCase()) ||
      (/^\p{Lu}/u.test(nextWord) && !INCOMPLETE_BOUNDARY_WORDS.has(currentWord.toLocaleLowerCase()))
    ) {
      candidates.push({ index, priority: 2 });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    const leftImbalance = Math.abs((left.index - start + 1) - (end - left.index - 1));
    const rightImbalance = Math.abs((right.index - start + 1) - (end - right.index - 1));
    return leftImbalance - rightImbalance;
  });
  return candidates[0].index;
}

function endSentence(token: string): string {
  if (/[,;:]["')\]]*$/.test(token)) {
    return token.replace(/[,;:](["')\]]*)$/, ".$1");
  }
  return `${token}.`;
}

function capitalizeBoundaryWord(token: string): string {
  const word = lexicalWords(token)[0];
  if (!word) return token;
  return `${token.slice(0, word.start)}${word.value.charAt(0).toLocaleUpperCase()}${word.value.slice(1)}${token.slice(word.end)}`;
}

/** Inserts only genuine clause-boundary punctuation; never falls back to word-count wrapping. */
export function splitOverlongRecommendation(candidate: string): string {
  const tokens = candidate.trim().split(/\s+/).filter(Boolean);
  if (sentenceSpans(tokens).every(([start, end]) => end - start <= SENTENCE_ERROR_WORDS)) {
    return candidate;
  }

  for (const [initialStart, initialEnd] of sentenceSpans(tokens)) {
    let start = initialStart;
    while (initialEnd - start > SENTENCE_ERROR_WORDS) {
      const boundary = chooseClauseBoundary(tokens, start, initialEnd);
      if (boundary === null) break;
      tokens[boundary] = endSentence(tokens[boundary]);
      if (boundary + 1 < tokens.length) tokens[boundary + 1] = capitalizeBoundaryWord(tokens[boundary + 1]);
      start = boundary + 1;
    }
  }

  const transformed = tokens.join(" ");
  return recommendationWordsAlign(candidate, transformed) ? transformed : candidate;
}
