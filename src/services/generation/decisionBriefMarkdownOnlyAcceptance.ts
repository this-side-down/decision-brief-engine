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

function collectRequiredSectionFindings(markdown: string): {
  missing: string[];
  empty: string[];
} {
  const sections = parseDecisionBriefSections(markdown);
  return {
    missing: getDefaultRequiredSections().filter((name) => !sections.has(name)),
    empty: getDefaultRequiredSections().filter((name) => {
    const body = sections.get(name);
      return typeof body === "string" && body.trim().length === 0;
    }),
  };
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

  const requiredSections = collectRequiredSectionFindings(result.markdown);
  if (requiredSections.missing.length > 0 || requiredSections.empty.length > 0) {
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
    missingRequiredSections: requiredSections.missing,
    emptyRequiredSections: requiredSections.empty,
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


  if (findings.emptyRequiredSections?.length > 0) {
    lines.push(`Empty required sections: ${findings.emptyRequiredSections.join(", ")}`);
  }

  if (findings.alignmentFailures.some((failure) => failure.id === "recommendation_alignment")) {
    lines.push("Recommendation section must begin with captureLayer.recommendation_candidate verbatim; line-wrap it without changing the text if it exceeds the sentence limit.");
  }

  if (findings.alignmentFailures.some((failure) => failure.id === "next_step_alignment")) {
    const detail = findings.alignmentFailures.find((failure) => failure.id === "next_step_alignment")?.detail;
    lines.push(`Suggested Next Steps must represent every captureLayer.suggested_next_steps item exactly once in source order. ${detail ?? ""}`.trim());
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

  return lines;
}
