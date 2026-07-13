import type { CaptureLayer } from "../types/captureLayer";
import { DECISION_BRIEF_MARKDOWN_STRUCTURE } from "../services/generation/types";
import {
  BANNED_CANNED_PHRASES,
  BANNED_CONSULTANT_FILLER,
  DECISION_BRIEF_REQUIRED_SECTIONS,
  GENERIC_BUSINESS_TERMS,
  INTENSIFIERS,
  MAX_NEGATION_PATTERNS,
  MAX_SLASH_PAIRS,
  SENTENCE_ERROR_WORDS,
  SENTENCE_WARNING_MIN_WORDS,
  SUMMARY_MAX_WORDS,
} from "./decisionBriefWritingRules";

export type WritingFindingSeverity = "error" | "warning" | "report";

export type WritingFinding = {
  ruleId: string;
  severity: WritingFindingSeverity;
  message: string;
  excerpt?: string;
  section?: string;
};

export type DecisionBriefWritingCheckResult = {
  passed: boolean;
  errors: WritingFinding[];
  warnings: WritingFinding[];
  reports: WritingFinding[];
};

export type DecisionBriefWritingCheckContext = {
  requiredSections?: readonly string[];
  captureLayer?: CaptureLayer | null;
  sourceText?: string;
};

const URL_PLACEHOLDER = "__URL__";
const EMOJI_PATTERN =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const NEGATION_PATTERN = /\bnot\b[^.!?]{0,120}\bbut\b/gi;
const BARE_CONFIDENCE_PATTERN = /^Confidence:\s*(High|Medium|Low)\s*$/i;
const SENTENCE_SPLIT_PATTERN = /(?<=[.!?])\s+(?=[A-Z0-9"“])/;

function normalizePhrase(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function countWords(text: string): number {
  const stripped = text
    .replace(/[`*_~[\]()]/g, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();

  if (!stripped) {
    return 0;
  }

  return stripped.split(/\s+/).filter(Boolean).length;
}

function stripFencedCodeBlocks(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, " ");
}

function maskUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, URL_PLACEHOLDER);
}

function stripMarkdownSyntaxForProse(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/^\s*[-*]\s+\[[ xX]\]\s+/gm, "")
    .trim();
}

export function parseDecisionBriefSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.split("\n");
  let currentSection = "";
  const content: string[] = [];

  function flushSection() {
    if (!currentSection) {
      return;
    }
    sections.set(currentSection, content.join("\n").trim());
    content.length = 0;
  }

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+?)\s*$/);
    if (headingMatch) {
      flushSection();
      currentSection = headingMatch[1].trim();
      continue;
    }

    if (line.startsWith("# ")) {
      continue;
    }

    if (currentSection) {
      content.push(line);
    }
  }

  flushSection();
  return sections;
}

function extractProseSections(markdown: string): Map<string, string> {
  const withoutCode = stripFencedCodeBlocks(markdown);
  const sections = parseDecisionBriefSections(withoutCode);
  const proseSections = new Map<string, string>();

  for (const [name, body] of sections) {
    proseSections.set(name, stripMarkdownSyntaxForProse(body));
  }

  return proseSections;
}

export function splitProseSentences(text: string): string[] {
  const prose = stripMarkdownSyntaxForProse(maskUrls(text));
  if (!prose.trim()) {
    return [];
  }

  const units: string[] = [];

  for (const rawLine of prose.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (/[.!?](?:\s|$)/.test(line)) {
      units.push(
        ...line
          .split(SENTENCE_SPLIT_PATTERN)
          .map((sentence) => sentence.trim())
          .filter(Boolean),
      );
      continue;
    }

    units.push(line);
  }

  return units;
}

function containsBannedPhrase(text: string, phrase: string): string | null {
  const normalizedText = normalizePhrase(
    text.replace(/[.,!?;:()[\]{}]/g, " "),
  );
  const normalizedPhrase = normalizePhrase(phrase);

  if (!normalizedPhrase) {
    return null;
  }

  const index = normalizedText.indexOf(normalizedPhrase);
  if (index === -1) {
    return null;
  }

  const start = Math.max(0, index - 20);
  const end = Math.min(normalizedText.length, index + normalizedPhrase.length + 20);
  return normalizedText.slice(start, end).trim();
}

function isSectionEmpty(sectionBody: string): boolean {
  const prose = stripMarkdownSyntaxForProse(sectionBody);
  if (!prose) {
    return true;
  }

  const withoutListMarkers = prose
    .split("\n")
    .map((line) => line.replace(/^[-*+]\s+/, "").trim())
    .filter(Boolean);

  if (withoutListMarkers.length === 0) {
    return true;
  }

  return withoutListMarkers.every((line) => line === "Not captured yet.");
}

function sectionRestatesHeading(sectionName: string, sectionBody: string): boolean {
  const firstSentence = splitProseSentences(sectionBody)[0];
  if (!firstSentence) {
    return false;
  }

  const normalizedHeading = normalizePhrase(sectionName);
  const normalizedSentence = normalizePhrase(firstSentence);

  return (
    normalizedSentence.startsWith(normalizedHeading) ||
    normalizedSentence.includes(`${normalizedHeading}:`)
  );
}

function collectCaptureLayerText(captureLayer: CaptureLayer): string {
  const values: string[] = [
    captureLayer.source_summary,
    captureLayer.decision_context,
    captureLayer.stated_decision,
    captureLayer.implied_decision,
    captureLayer.recommendation_candidate,
    ...captureLayer.goals,
    ...captureLayer.stakeholders,
    ...captureLayer.options_considered,
    ...captureLayer.constraints,
    ...captureLayer.risks,
    ...captureLayer.assumptions,
    ...captureLayer.evidence,
    ...captureLayer.open_questions,
    ...captureLayer.tensions,
    ...captureLayer.missing_context,
    ...captureLayer.suggested_next_steps,
  ];

  return values.join(" ");
}

function extractSourceSignals(text: string): { properNouns: string[]; quantities: string[] } {
  const properNouns = new Set<string>();
  const quantities = new Set<string>();

  const properNounMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
  for (const match of properNounMatches) {
    if (!["Summary", "Decision", "Options", "Recommendation", "Risks", "Constraints", "Open", "Questions", "Suggested", "Next", "Steps", "Confidence", "High", "Medium", "Low"].includes(match)) {
      properNouns.add(match);
    }
  }

  const acronymMatches = text.match(/\b[A-Z]{2,}\b/g) ?? [];
  for (const match of acronymMatches) {
    properNouns.add(match);
  }

  const quantityMatches = text.match(/\$?\d[\d,.%kK–-]*/g) ?? [];
  for (const match of quantityMatches) {
    quantities.add(match);
  }

  return {
    properNouns: [...properNouns],
    quantities: [...quantities],
  };
}

function countSlashPairs(text: string): number {
  let count = 0;

  for (const token of text.match(/\b[\w%$]+(?:\s*\/\s*[\w%$]+)+\b/g) ?? []) {
    count += token.split(/\s*\/\s*/).length - 1;
  }

  return count;
}

function tokenOverlapRatio(left: string, right: string): number {
  const leftTokens = new Set(
    normalizePhrase(left)
      .split(/\W+/)
      .filter((token) => token.length > 3),
  );
  const rightTokens = normalizePhrase(right)
    .split(/\W+/)
    .filter((token) => token.length > 3);

  if (leftTokens.size === 0 || rightTokens.length === 0) {
    return 0;
  }

  const overlap = rightTokens.filter((token) => leftTokens.has(token)).length;
  return overlap / rightTokens.length;
}

function addFinding(
  bucket: WritingFinding[],
  finding: WritingFinding,
) {
  bucket.push(finding);
}

export function evaluateDecisionBriefWriting(
  markdown: string,
  context: DecisionBriefWritingCheckContext = {},
): DecisionBriefWritingCheckResult {
  const errors: WritingFinding[] = [];
  const warnings: WritingFinding[] = [];
  const reports: WritingFinding[] = [];
  const requiredSections = context.requiredSections ?? DECISION_BRIEF_REQUIRED_SECTIONS;
  const proseMarkdown = stripFencedCodeBlocks(markdown);
  const proseSections = extractProseSections(markdown);
  const fullProse = stripMarkdownSyntaxForProse(proseMarkdown);

  if (markdown.includes("\u2014")) {
    addFinding(errors, {
      ruleId: "em-dash",
      severity: "error",
      message: "Decision Brief contains an em dash (U+2014).",
    });
  }

  if (EMOJI_PATTERN.test(fullProse)) {
    addFinding(errors, {
      ruleId: "emoji",
      severity: "error",
      message: "Decision Brief contains emoji in prose.",
    });
  }

  if (/!(?!\=)/.test(maskUrls(fullProse))) {
    addFinding(errors, {
      ruleId: "exclamation",
      severity: "error",
      message: "Decision Brief contains exclamation marks in prose.",
    });
  }

  for (const phrase of [...BANNED_CANNED_PHRASES, ...BANNED_CONSULTANT_FILLER]) {
    const excerpt = containsBannedPhrase(fullProse, phrase);
    if (excerpt) {
      addFinding(errors, {
        ruleId: "banned-phrase",
        severity: "error",
        message: `Decision Brief contains banned phrase: "${phrase}".`,
        excerpt,
      });
    }
  }

  for (const sectionName of requiredSections) {
    if (!proseSections.has(sectionName)) {
      addFinding(errors, {
        ruleId: "missing-section",
        severity: "error",
        message: `Required section is missing: ${sectionName}.`,
        section: sectionName,
      });
    }
  }

  for (const [sectionName, sectionBody] of parseDecisionBriefSections(markdown)) {
    if (requiredSections.includes(sectionName) && isSectionEmpty(sectionBody)) {
      addFinding(errors, {
        ruleId: "empty-section",
        severity: "error",
        message: `Required section is empty: ${sectionName}.`,
        section: sectionName,
      });
    }
  }

  const summary = proseSections.get("Summary") ?? "";
  const summaryWords = countWords(summary);
  if (summaryWords > SUMMARY_MAX_WORDS) {
    addFinding(errors, {
      ruleId: "summary-length",
      severity: "error",
      message: `Summary exceeds ${SUMMARY_MAX_WORDS} words (${summaryWords}).`,
      section: "Summary",
    });
  }

  for (const [sectionName, sectionBody] of proseSections) {
    for (const sentence of splitProseSentences(sectionBody)) {
      const words = countWords(sentence);
      if (words > SENTENCE_ERROR_WORDS) {
        addFinding(errors, {
          ruleId: "sentence-length",
          severity: "error",
          message: `Sentence exceeds ${SENTENCE_ERROR_WORDS} words (${words}).`,
          excerpt: sentence.slice(0, 120),
          section: sectionName,
        });
      } else if (words >= SENTENCE_WARNING_MIN_WORDS) {
        addFinding(warnings, {
          ruleId: "sentence-length-warning",
          severity: "warning",
          message: `Sentence is ${words} words (warning range ${SENTENCE_WARNING_MIN_WORDS}-${SENTENCE_ERROR_WORDS}).`,
          excerpt: sentence.slice(0, 120),
          section: sectionName,
        });
      }
    }
  }

  const confidenceSection = proseSections.get("Confidence") ?? "";
  if (confidenceSection && BARE_CONFIDENCE_PATTERN.test(confidenceSection.trim())) {
    addFinding(errors, {
      ruleId: "bare-confidence",
      severity: "error",
      message: "Confidence section states a label without an explanation.",
      section: "Confidence",
    });
  }

  const negationMatches = fullProse.match(NEGATION_PATTERN) ?? [];
  if (negationMatches.length > MAX_NEGATION_PATTERNS) {
    addFinding(warnings, {
      ruleId: "negation-pattern",
      severity: "warning",
      message: `Document contains ${negationMatches.length} negation-definition patterns.`,
    });
  }

  const slashPairCount = countSlashPairs(fullProse);
  if (slashPairCount > MAX_SLASH_PAIRS) {
    addFinding(warnings, {
      ruleId: "slash-pairs",
      severity: "warning",
      message: `Document contains ${slashPairCount} slash-pair shorthand instances.`,
    });
  }

  for (const [sectionName, sectionBody] of proseSections) {
    if (sectionRestatesHeading(sectionName, sectionBody)) {
      addFinding(warnings, {
        ruleId: "section-restates-heading",
        severity: "warning",
        message: `Section begins by restating its heading: ${sectionName}.`,
        section: sectionName,
      });
    }
  }

  const intensifierCount = INTENSIFIERS.reduce((count, word) => {
    const matches = fullProse.match(new RegExp(`\\b${word}\\b`, "gi")) ?? [];
    return count + matches.length;
  }, 0);

  if (intensifierCount > 2) {
    addFinding(warnings, {
      ruleId: "intensifiers",
      severity: "warning",
      message: `Document contains ${intensifierCount} intensifier words.`,
    });
  }

  if (context.captureLayer) {
    const captureText = collectCaptureLayerText(context.captureLayer);
    const briefText = fullProse;
    const sourceSignals = extractSourceSignals(captureText);

    for (const properNoun of sourceSignals.properNouns) {
      if (!briefText.includes(properNoun)) {
        addFinding(reports, {
          ruleId: "missing-source-proper-noun",
          severity: "report",
          message: `Capture Layer proper noun not found in brief: ${properNoun}.`,
        });
      }
    }

    for (const quantity of sourceSignals.quantities) {
      if (!briefText.includes(quantity)) {
        addFinding(reports, {
          ruleId: "missing-source-quantity",
          severity: "report",
          message: `Capture Layer quantity not found in brief: ${quantity}.`,
        });
      }
    }

    const overlap = tokenOverlapRatio(captureText, briefText);
    if (overlap >= 0.55) {
      addFinding(reports, {
        ruleId: "high-capture-reuse",
        severity: "report",
        message: `Brief shares ${Math.round(overlap * 100)}% token overlap with Capture Layer text.`,
      });
    }
  }

  const sourceText = context.sourceText ?? "";
  if (sourceText) {
    const normalizedSource = normalizePhrase(sourceText);
    for (const term of GENERIC_BUSINESS_TERMS) {
      if (
        containsBannedPhrase(fullProse, term) &&
        !normalizedSource.includes(normalizePhrase(term))
      ) {
        addFinding(reports, {
          ruleId: "novel-generic-term",
          severity: "report",
          message: `Brief introduces generic business term not present in source: ${term}.`,
        });
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    reports,
  };
}

export function getDefaultRequiredSections(): readonly string[] {
  return [...DECISION_BRIEF_MARKDOWN_STRUCTURE, "Confidence"];
}
