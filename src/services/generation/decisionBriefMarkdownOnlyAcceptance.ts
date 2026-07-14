import { evaluateBriefMarkdownAlignment } from "../../evaluation/pipeline/alignmentChecks";
import {
  evaluateDecisionBriefWriting,
  getDefaultRequiredSections,
  parseDecisionBriefSections,
} from "../../evaluation/decisionBriefWritingChecks";
import type { CaptureLayer } from "../../types/captureLayer";
import {
  detectDecisionBriefPlaceholderLeakage,
  type PlaceholderLeakFinding,
} from "./decisionBriefPlaceholderDetection";
import type { SemanticAcceptanceDetailedFindings } from "./decisionBriefSemanticAcceptance";
import type { DecisionBriefResult } from "./types";

export type MarkdownOnlyAcceptanceFailureCategory =
  | "placeholder_leakage"
  | "required_sections"
  | "recommendation_alignment"
  | "next_step_alignment"
  | "writing_hard_failure";

export type MarkdownOnlyAcceptanceResult = {
  accepted: boolean;
  failureCategories: MarkdownOnlyAcceptanceFailureCategory[];
  decisionTraceApplicable: false;
  placeholderFindings: PlaceholderLeakFinding[];
  detailedFindings: SemanticAcceptanceDetailedFindings;
};

function collectMissingRequiredSections(markdown: string): string[] {
  const sections = parseDecisionBriefSections(markdown);
  return getDefaultRequiredSections().filter((name) => {
    const body = sections.get(name);
    return typeof body !== "string" || body.trim().length === 0;
  });
}

/**
 * Evaluation-only acceptance gate for markdown-only WebGPU experiment (#141).
 * Decision Trace checks are not applicable and are never recorded as passing.
 */
export function evaluateDecisionBriefMarkdownOnlyAcceptance(options: {
  result: DecisionBriefResult;
  captureLayer: CaptureLayer;
}): MarkdownOnlyAcceptanceResult {
  const { result, captureLayer } = options;
  const failureCategories: MarkdownOnlyAcceptanceFailureCategory[] = [];

  const placeholderFindings = detectDecisionBriefPlaceholderLeakage(result);
  if (placeholderFindings.length > 0) {
    failureCategories.push("placeholder_leakage");
  }

  const missingRequiredSections = collectMissingRequiredSections(result.markdown);
  if (missingRequiredSections.length > 0) {
    failureCategories.push("required_sections");
  }

  const alignment = evaluateBriefMarkdownAlignment({
    captureLayer,
    briefMarkdown: result.markdown,
  });
  if (!alignment.recommendationAlignmentPass) {
    failureCategories.push("recommendation_alignment");
  }
  if (!alignment.nextStepAlignmentPass) {
    failureCategories.push("next_step_alignment");
  }

  const writing = evaluateDecisionBriefWriting(result.markdown, {
    captureLayer,
  });
  if (!writing.passed) {
    failureCategories.push("writing_hard_failure");
  }

  const uncoveredRecommendationStatements =
    alignment.recommendationMismatchSources
      ? [
          `capture="${alignment.recommendationMismatchSources.capture}"`,
          `brief="${alignment.recommendationMismatchSources.brief}"`,
        ]
      : [];

  const detailedFindings: SemanticAcceptanceDetailedFindings = {
    missingRequiredSections,
    traceReadinessFailures: [],
    alignmentFailures: alignment.findings
      .filter((check) => !check.pass)
      .map((check) => ({ id: check.id, detail: check.detail })),
    writingHardFailures: writing.errors.map((finding) => ({
      ruleId: finding.ruleId,
      message: finding.message,
      excerpt: finding.excerpt,
      section: finding.section,
    })),
    placeholderFindings,
    uncoveredRecommendationStatements,
    uncoveredNextStepStatements: alignment.uncoveredNextStepStatements,
  };

  return {
    accepted: failureCategories.length === 0,
    failureCategories,
    decisionTraceApplicable: false,
    placeholderFindings,
    detailedFindings,
  };
}

export function formatMarkdownOnlyAcceptanceFindingLines(
  findings: SemanticAcceptanceDetailedFindings,
): string[] {
  const lines: string[] = ["Decision Trace checks: not applicable (markdown_only experiment)"];

  if (findings.missingRequiredSections.length > 0) {
    lines.push(
      `Missing required sections: ${findings.missingRequiredSections.join(", ")}`,
    );
  }

  for (const failure of findings.alignmentFailures) {
    lines.push(`Alignment (${failure.id}): ${failure.detail}`);
  }

  for (const failure of findings.writingHardFailures) {
    const excerpt = failure.excerpt ? ` — "${failure.excerpt}"` : "";
    lines.push(`Writing rule ${failure.ruleId}: ${failure.message}${excerpt}`);
  }

  for (const finding of findings.placeholderFindings) {
    lines.push(
      `Placeholder leakage (${finding.category}) at ${finding.fieldPath}: ${finding.description}`,
    );
  }

  if (findings.uncoveredRecommendationStatements.length > 0) {
    lines.push(
      `Recommendation alignment sources: ${findings.uncoveredRecommendationStatements.join("; ")}`,
    );
  }

  if (findings.uncoveredNextStepStatements.length > 0) {
    lines.push(
      `Uncovered next steps: ${findings.uncoveredNextStepStatements
        .map((step) => `"${step}"`)
        .join("; ")}`,
    );
  }

  return lines;
}
