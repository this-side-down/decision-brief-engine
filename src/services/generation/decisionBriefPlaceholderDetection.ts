import type { DecisionBriefResult } from "./types";
import { DECISION_TRACE_BASIS_ARRAY_FIELDS } from "./parseDecisionTrace";

export type PlaceholderLeakCategory =
  | "markdown_template"
  | "statement_template"
  | "intent_template"
  | "supporting_evidence_template"
  | "assumptions_template"
  | "risks_addressed_template"
  | "risks_accepted_template"
  | "constraints_template"
  | "tradeoffs_template"
  | "alternatives_template"
  | "missing_context_template"
  | "would_change_if_template";

export type PlaceholderLeakFinding = {
  fieldPath: string;
  category: PlaceholderLeakCategory;
  description: string;
};

/** Canonical prompt-template phrases that must not appear in model output. */
export const KNOWN_PLACEHOLDER_PHRASES: ReadonlyArray<{
  category: PlaceholderLeakCategory;
  phrases: readonly string[];
}> = [
  {
    category: "markdown_template",
    phrases: [
      "full markdown brief here",
      "[full markdown brief here",
    ],
  },
  {
    category: "statement_template",
    phrases: [
      "the recommendation or next step, verbatim from the brief",
      "recommendation or next step, verbatim from the brief",
    ],
  },
  {
    category: "intent_template",
    phrases: [
      "which goal from the capture layer this serves",
      "goal from the capture layer this serves",
    ],
  },
  {
    category: "supporting_evidence_template",
    phrases: [
      "evidence item from the capture layer",
    ],
  },
  {
    category: "assumptions_template",
    phrases: [
      "assumption from the capture layer this depends on",
    ],
  },
  {
    category: "risks_addressed_template",
    phrases: [
      "risk from the capture layer this mitigates",
    ],
  },
  {
    category: "risks_accepted_template",
    phrases: [
      "risk from the capture layer this accepts or defers",
      "risk from the capture layer this accepts",
    ],
  },
  {
    category: "constraints_template",
    phrases: [
      "constraint from the capture layer this stays within",
    ],
  },
  {
    category: "tradeoffs_template",
    phrases: [
      "tradeoff or tension from the capture layer this navigates",
    ],
  },
  {
    category: "alternatives_template",
    phrases: [
      "alternative considered and why not selected",
    ],
  },
  {
    category: "missing_context_template",
    phrases: [
      "missing context item that qualifies this entry's reliability",
      "missing context item that qualifies",
    ],
  },
  {
    category: "would_change_if_template",
    phrases: [
      "specific condition that would lead to a different outcome",
    ],
  },
] as const;

/** Exact strings from the legacy example schema — used to lint WebGPU prompts. */
export const FORBIDDEN_WEBGPU_PROMPT_PLACEHOLDER_STRINGS = [
  "# Decision Brief\n[full Markdown brief here — newlines as \\n]",
  "The recommendation or next step, verbatim from the brief.",
  "Which goal from the Capture Layer this serves.",
  "Evidence item from the Capture Layer.",
  "Assumption from the Capture Layer this depends on.",
  "Risk from the Capture Layer this mitigates.",
  "Risk from the Capture Layer this accepts or defers.",
  "Constraint from the Capture Layer this stays within.",
  "Tradeoff or tension from the Capture Layer this navigates.",
  "Alternative considered and why not selected.",
  "Missing context item that qualifies this entry's reliability.",
  "Specific condition that would lead to a different outcome.",
] as const;

const CATEGORY_DESCRIPTIONS: Record<PlaceholderLeakCategory, string> = {
  markdown_template: "Markdown contains prompt template placeholder text",
  statement_template: "Decision Trace statement contains prompt template text",
  intent_template: "basis.intent contains prompt template text",
  supporting_evidence_template:
    "supporting_evidence contains prompt template text",
  assumptions_template: "assumptions_relied_on contains prompt template text",
  risks_addressed_template: "risks_addressed contains prompt template text",
  risks_accepted_template: "risks_accepted contains prompt template text",
  constraints_template: "constraints_respected contains prompt template text",
  tradeoffs_template: "tradeoffs contains prompt template text",
  alternatives_template: "alternatives_considered contains prompt template text",
  missing_context_template:
    "missing_context_caveats contains prompt template text",
  would_change_if_template: "would_change_if contains prompt template text",
};

export function normalizeForPlaceholderMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesPlaceholderPhrase(text: string, phrase: string): boolean {
  const normalizedText = normalizeForPlaceholderMatch(text);
  const normalizedPhrase = normalizeForPlaceholderMatch(phrase);

  if (!normalizedPhrase) {
    return false;
  }

  return normalizedText.includes(normalizedPhrase);
}

function findPlaceholderInText(
  text: string,
  fieldPath: string,
): PlaceholderLeakFinding[] {
  const findings: PlaceholderLeakFinding[] = [];

  for (const { category, phrases } of KNOWN_PLACEHOLDER_PHRASES) {
    for (const phrase of phrases) {
      if (matchesPlaceholderPhrase(text, phrase)) {
        findings.push({
          fieldPath,
          category,
          description: CATEGORY_DESCRIPTIONS[category],
        });
        break;
      }
    }
  }

  return findings;
}

/**
 * Pure detector for prompt-template leakage across user-facing Decision Brief
 * and Decision Trace string fields.
 */
export function detectDecisionBriefPlaceholderLeakage(
  result: DecisionBriefResult,
): PlaceholderLeakFinding[] {
  const findings: PlaceholderLeakFinding[] = [
    ...findPlaceholderInText(result.markdown, "markdown"),
  ];

  result.decisionTrace.entries.forEach((entry, entryIndex) => {
    const entryPrefix = `decisionTrace.entries[${entryIndex}]`;

    findings.push(
      ...findPlaceholderInText(entry.statement, `${entryPrefix}.statement`),
      ...findPlaceholderInText(entry.basis.intent, `${entryPrefix}.basis.intent`),
    );

    for (const field of DECISION_TRACE_BASIS_ARRAY_FIELDS) {
      entry.basis[field].forEach((item, itemIndex) => {
        findings.push(
          ...findPlaceholderInText(
            item,
            `${entryPrefix}.basis.${field}[${itemIndex}]`,
          ),
        );
      });
    }

    entry.would_change_if.forEach((item, itemIndex) => {
      findings.push(
        ...findPlaceholderInText(
          item,
          `${entryPrefix}.would_change_if[${itemIndex}]`,
        ),
      );
    });
  });

  return findings;
}
