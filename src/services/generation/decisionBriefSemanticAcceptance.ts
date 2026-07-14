import { evaluateArtifactAlignment } from "../../evaluation/pipeline/alignmentChecks";
import {
  evaluateDecisionBriefWriting,
  getDefaultRequiredSections,
  parseDecisionBriefSections,
} from "../../evaluation/decisionBriefWritingChecks";
import { evaluateDecisionTraceReadiness } from "../../evaluation/decisionTraceChecks";
import type { CaptureLayer } from "../../types/captureLayer";
import {
  detectDecisionBriefPlaceholderLeakage,
  type PlaceholderLeakFinding,
} from "./decisionBriefPlaceholderDetection";
import type { DecisionBriefResult } from "./types";

export type SemanticAcceptanceFailureCategory =
  | "placeholder_leakage"
  | "required_sections"
  | "decision_trace_readiness"
  | "recommendation_alignment"
  | "next_step_alignment"
  | "writing_hard_failure";

export type SemanticAcceptanceDetailedFindings = {
  missingRequiredSections: string[];
  traceReadinessFailures: Array<{ id: string; detail: string }>;
  alignmentFailures: Array<{ id: string; detail: string }>;
  writingHardFailures: Array<{
    ruleId: string;
    message: string;
    excerpt?: string;
    section?: string;
  }>;
  placeholderFindings: PlaceholderLeakFinding[];
  uncoveredRecommendationStatements: string[];
  uncoveredNextStepStatements: string[];
};

export type SemanticAcceptanceResult = {
  accepted: boolean;
  failureCategories: SemanticAcceptanceFailureCategory[];
  placeholderFindings: PlaceholderLeakFinding[];
  detailedFindings: SemanticAcceptanceDetailedFindings;
};

function requiredDecisionBriefSectionsPass(markdown: string): boolean {
  const sections = parseDecisionBriefSections(markdown);
  return getDefaultRequiredSections().every((name) => {
    const body = sections.get(name);
    return typeof body === "string" && body.trim().length > 0;
  });
}

function collectMissingRequiredSections(markdown: string): string[] {
  const sections = parseDecisionBriefSections(markdown);
  return getDefaultRequiredSections().filter((name) => {
    const body = sections.get(name);
    return typeof body !== "string" || body.trim().length === 0;
  });
}

export function buildDecisionBriefQualityRetrySuffix(
  failureCategories: readonly string[],
): string {
  const uniqueCategories = [...new Set(failureCategories.filter(Boolean))];
  const categoryList =
    uniqueCategories.length > 0 ? uniqueCategories.join(", ") : "quality validation";

  return `\n\nRegenerate the complete result. The prior result was rejected because it contained template language or failed required artifact-quality checks (${categoryList}). Use only specific content grounded in the Capture Layer. Do not use instructional, example, placeholder, or field-description text as output.`;
}

/**
 * Pure semantic acceptance gate for parsed Decision Brief results.
 * Reuses existing product validators; warnings and report-only writing
 * findings do not independently reject the result.
 */
export function evaluateDecisionBriefSemanticAcceptance(options: {
  result: DecisionBriefResult;
  captureLayer: CaptureLayer;
}): SemanticAcceptanceResult {
  const { result, captureLayer } = options;
  const failureCategories: SemanticAcceptanceFailureCategory[] = [];

  const placeholderFindings = detectDecisionBriefPlaceholderLeakage(result);
  if (placeholderFindings.length > 0) {
    failureCategories.push("placeholder_leakage");
  }

  const missingRequiredSections = collectMissingRequiredSections(result.markdown);
  if (missingRequiredSections.length > 0) {
    failureCategories.push("required_sections");
  }

  const traceReadiness = evaluateDecisionTraceReadiness(
    captureLayer,
    result.decisionTrace,
  );
  if (!traceReadiness.pass) {
    failureCategories.push("decision_trace_readiness");
  }

  const alignment = evaluateArtifactAlignment({
    captureLayer,
    decisionTrace: result.decisionTrace,
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
    alignment.recommendationMismatchSources &&
    (alignment.recommendationMismatchSources.capture ||
      alignment.recommendationMismatchSources.brief ||
      alignment.recommendationMismatchSources.trace)
      ? [
          `capture="${alignment.recommendationMismatchSources.capture}"`,
          `brief="${alignment.recommendationMismatchSources.brief}"`,
          `trace="${alignment.recommendationMismatchSources.trace}"`,
        ]
      : [];

  const detailedFindings: SemanticAcceptanceDetailedFindings = {
    missingRequiredSections,
    traceReadinessFailures: traceReadiness.checks
      .filter((check) => !check.pass)
      .map((check) => ({ id: check.id, detail: check.detail })),
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
    placeholderFindings,
    detailedFindings,
  };
}

export function formatSemanticAcceptanceFindingLines(
  findings: SemanticAcceptanceDetailedFindings,
): string[] {
  const lines: string[] = [];

  if (findings.missingRequiredSections.length > 0) {
    lines.push(
      `Missing required sections: ${findings.missingRequiredSections.join(", ")}`,
    );
  }

  for (const failure of findings.traceReadinessFailures) {
    lines.push(`Decision Trace readiness (${failure.id}): ${failure.detail}`);
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
