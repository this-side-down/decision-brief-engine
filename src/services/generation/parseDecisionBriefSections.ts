import { DECISION_BRIEF_REQUIRED_SECTIONS } from "../../evaluation/decisionBriefWritingRules";
import type { CaptureLayer } from "../../types/captureLayer";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";

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

function wrapLines(body: string, maxWords = 35): string {
  return body.split("\n").flatMap((line) => {
    const words = line.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return [line.trim()];
    const lines: string[] = [];
    for (let index = 0; index < words.length; index += maxWords) {
      lines.push(words.slice(index, index + maxWords).join(" "));
    }
    return lines;
  }).join("\n");
}

function boundSummary(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 60).join(" ");
}

function formatBody(body: string, heading: string): string {
  const normalized = body.replace(/\u2014/g, " - ").trim();
  return wrapLines(heading === "Summary" ? boundSummary(normalized) : normalized);
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
      return wrapLines(options.captureLayer.recommendation_candidate);
    }
    if (heading === "Suggested Next Steps" && options.captureLayer) {
      return options.captureLayer.suggested_next_steps.map((step) => `- ${step}`).join("\n");
    }
    return formatBody(body, heading);
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
