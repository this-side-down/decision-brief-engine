import { DECISION_BRIEF_REQUIRED_SECTIONS } from "../../evaluation/decisionBriefWritingRules";
import type { CaptureLayer } from "../../types/captureLayer";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";
import { splitOverlongRecommendation } from "./recommendationSourceBinding";

const FIELD_NAMES = [
  "summary",
  "decisionContext",
  "optionsConsidered",
  "recommendation",
  "risksAndConstraints",
  "openQuestions",
  "suggestedNextSteps",
  "confidence",
] as const;

function normalizePunctuation(body: string): string {
  return body
    .replace(/\u2014/g, " - ")
    .trim()
    .split(/\n\s*\n+/)
    .map((paragraph) => {
      const lines = paragraph.split("\n").map((line) => line.trim());
      const isList = lines.every((line) => !line || /^[-*+]\s+|^\d+\.\s+/.test(line));
      return isList ? lines.join("\n") : lines.filter(Boolean).join(" ");
    })
    .join("\n\n");
}

export function parseDecisionBriefSectionsJson(
  rawText: string,
  options: { captureLayer?: CaptureLayer } = {},
): string {
  let value: unknown;
  try {
    value = JSON.parse(rawText);
  } catch {
    throw new DecisionBriefContractError("Decision Brief section scaffold returned invalid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DecisionBriefContractError("Decision Brief section scaffold must be a JSON object.");
  }
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record).sort();
  const expectedKeys = [...FIELD_NAMES].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new DecisionBriefContractError("Decision Brief section scaffold must contain exactly eight required fields.");
  }
  const bodies = FIELD_NAMES.map((field, index) => {
    const body = record[field];
    if (typeof body !== "string") {
      throw new DecisionBriefContractError(`Decision Brief section field ${field} must be a string.`);
    }
    const heading = DECISION_BRIEF_REQUIRED_SECTIONS[index];
    if (heading === "Recommendation" && options.captureLayer?.recommendation_candidate) {
      return splitOverlongRecommendation(
        normalizePunctuation(options.captureLayer.recommendation_candidate),
      );
    }
    if (heading === "Suggested Next Steps" && options.captureLayer) {
      return options.captureLayer.suggested_next_steps.map((step) => `- ${step}`).join("\n");
    }
    return normalizePunctuation(body);
  });
  return [
    "# Decision Brief",
    "",
    ...DECISION_BRIEF_REQUIRED_SECTIONS.flatMap((heading, index) => [
      `## ${heading}`,
      bodies[index],
      "",
    ]),
  ].join("\n").trimEnd();
}
