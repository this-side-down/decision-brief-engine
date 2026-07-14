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

export type SemanticAcceptanceResult = {
  accepted: boolean;
  failureCategories: SemanticAcceptanceFailureCategory[];
  placeholderFindings: PlaceholderLeakFinding[];
};

function requiredDecisionBriefSectionsPass(markdown: string): boolean {
  const sections = parseDecisionBriefSections(markdown);
  return getDefaultRequiredSections().every((name) => {
    const body = sections.get(name);
    return typeof body === "string" && body.trim().length > 0;
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

  if (!requiredDecisionBriefSectionsPass(result.markdown)) {
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

  return {
    accepted: failureCategories.length === 0,
    failureCategories,
    placeholderFindings,
  };
}
