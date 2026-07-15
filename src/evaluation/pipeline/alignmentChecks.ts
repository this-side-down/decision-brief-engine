import type { CaptureLayer } from "../../types/captureLayer";
import type { DecisionTrace } from "../../types/decisionTrace";
import {
  extractRecommendationSection,
  normalizeRecommendationText,
  parseDecisionBriefSections,
} from "../decisionBriefWritingChecks";
import type { StructuralCheck } from "../types";
import { recommendationWordsAlign } from "../../services/generation/recommendationSourceBinding";

function check(id: string, pass: boolean, detail: string): StructuralCheck {
  return { id, pass, detail };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function correspondsToText(statement: string, reference: string): boolean {
  const normalizedStatement = normalize(statement);
  const normalizedReference = normalize(reference);

  if (!normalizedStatement || !normalizedReference) {
    return false;
  }

  return (
    normalizedStatement === normalizedReference ||
    normalizedStatement.includes(normalizedReference) ||
    normalizedReference.includes(normalizedStatement)
  );
}

function extractNextStepLines(markdown: string): string[] {
  const body = parseDecisionBriefSections(markdown).get("Suggested Next Steps") ?? "";
  return body
    .split("\n")
    .map((line) =>
      normalizeRecommendationText(line.replace(/^[-*+\d.]+\s*/, "")),
    )
    .filter(Boolean)
    .filter((line) => line.toLowerCase() !== "not captured yet.");
}

/**
 * Recommendation and next-step statement alignment across Capture Layer,
 * Decision Trace, and Decision Brief. Reuses the same correspondence heuristic
 * as Decision Trace readiness checks and writing helpers.
 */
export function evaluateArtifactAlignment(options: {
  captureLayer: CaptureLayer;
  decisionTrace: DecisionTrace;
  briefMarkdown: string;
}): {
  recommendationAlignmentPass: boolean;
  nextStepAlignmentPass: boolean;
  findings: StructuralCheck[];
  uncoveredNextStepStatements: string[];
  recommendationMismatchSources: {
    capture: string;
    brief: string;
    trace: string;
  } | null;
} {
  const { captureLayer, decisionTrace, briefMarkdown } = options;
  const findings: StructuralCheck[] = [];

  const briefRecommendation = extractRecommendationSection(briefMarkdown);
  const captureRecommendation = normalizeRecommendationText(
    captureLayer.recommendation_candidate,
  );
  const recommendationEntries = decisionTrace.entries.filter(
    (entry) => entry.kind === "recommendation",
  );
  const traceRecommendation = recommendationEntries[0]?.statement ?? "";

  const briefMatchesCapture =
    !captureRecommendation ||
    recommendationWordsAlign(captureRecommendation, briefRecommendation);
  const traceMatchesCapture =
    !captureRecommendation ||
    recommendationEntries.some((entry) =>
      recommendationWordsAlign(captureRecommendation, entry.statement),
    );
  const briefMatchesTrace =
    !captureRecommendation ||
    !traceRecommendation ||
    recommendationWordsAlign(traceRecommendation, briefRecommendation);

  const recommendationAlignmentPass =
    briefMatchesCapture && traceMatchesCapture && briefMatchesTrace;

  findings.push(
    check(
      "recommendation_alignment",
      recommendationAlignmentPass,
      recommendationAlignmentPass
        ? "Recommendation statement aligns across Capture Layer, Decision Trace, and Decision Brief"
        : `Recommendation mismatch — capture="${captureRecommendation}" brief="${briefRecommendation}" trace="${normalizeRecommendationText(traceRecommendation)}"`,
    ),
  );

  const nextStepEntries = decisionTrace.entries.filter(
    (entry) => entry.kind === "next_step",
  );
  const briefNextSteps = extractNextStepLines(briefMarkdown);
  const captureNextSteps = captureLayer.suggested_next_steps.map((step) =>
    normalizeRecommendationText(step),
  );

  const uncoveredCaptureSteps = captureNextSteps.filter(
    (step) =>
      !nextStepEntries.some((entry) => correspondsToText(entry.statement, step)) ||
      !briefNextSteps.some((briefStep) => correspondsToText(briefStep, step)),
  );

  const nextStepCountAligned =
    nextStepEntries.length === captureNextSteps.length &&
    (captureNextSteps.length === 0 ||
      briefNextSteps.length === captureNextSteps.length);

  const nextStepAlignmentPass =
    uncoveredCaptureSteps.length === 0 && nextStepCountAligned;

  findings.push(
    check(
      "next_step_alignment",
      nextStepAlignmentPass,
      nextStepAlignmentPass
        ? "Next-step statements align across Capture Layer, Decision Trace, and Decision Brief"
        : `${uncoveredCaptureSteps.length} next-step mismatch(es); counts capture=${captureNextSteps.length} brief=${briefNextSteps.length} trace=${nextStepEntries.length}`,
    ),
  );

  return {
    recommendationAlignmentPass,
    nextStepAlignmentPass,
    findings,
    uncoveredNextStepStatements: uncoveredCaptureSteps,
    recommendationMismatchSources: recommendationAlignmentPass
      ? null
      : {
          capture: captureRecommendation,
          brief: briefRecommendation,
          trace: normalizeRecommendationText(traceRecommendation),
        },
  };
}

/**
 * Markdown-only alignment: Capture Layer recommendation and next steps vs Decision Brief.
 * Decision Trace is not applicable in this experiment.
 */
export function evaluateBriefMarkdownAlignment(options: {
  captureLayer: CaptureLayer;
  briefMarkdown: string;
}): {
  recommendationAlignmentPass: boolean;
  nextStepAlignmentPass: boolean;
  findings: StructuralCheck[];
  uncoveredNextStepStatements: string[];
  recommendationMismatchSources: {
    capture: string;
    brief: string;
  } | null;
} {
  const { captureLayer, briefMarkdown } = options;
  const findings: StructuralCheck[] = [];

  const briefRecommendation = extractRecommendationSection(briefMarkdown);
  const captureRecommendation = normalizeRecommendationText(
    captureLayer.recommendation_candidate,
  );

  const briefMatchesCapture =
    !captureRecommendation ||
    recommendationWordsAlign(captureRecommendation, briefRecommendation);

  findings.push(
    check(
      "recommendation_alignment",
      briefMatchesCapture,
      briefMatchesCapture
        ? "Recommendation in Decision Brief corresponds to Capture Layer recommendation_candidate"
        : `Recommendation mismatch — capture="${captureRecommendation}" brief="${briefRecommendation}"`,
    ),
  );

  const briefNextSteps = extractNextStepLines(briefMarkdown);
  const captureNextSteps = captureLayer.suggested_next_steps.map((step) =>
    normalizeRecommendationText(step),
  );

  const uncoveredCaptureSteps = captureNextSteps.filter(
    (step) => !briefNextSteps.some((briefStep) => correspondsToText(briefStep, step)),
  );

  const nextStepCountAligned =
    captureNextSteps.length === 0 ||
    briefNextSteps.length === captureNextSteps.length;

  const nextStepAlignmentPass =
    uncoveredCaptureSteps.length === 0 && nextStepCountAligned;

  findings.push(
    check(
      "next_step_alignment",
      nextStepAlignmentPass,
      nextStepAlignmentPass
        ? "All Capture Layer suggested_next_steps are represented in Decision Brief Suggested Next Steps"
        : `${uncoveredCaptureSteps.length} next-step mismatch(es); counts capture=${captureNextSteps.length} brief=${briefNextSteps.length}`,
    ),
  );

  return {
    recommendationAlignmentPass: briefMatchesCapture,
    nextStepAlignmentPass,
    findings,
    uncoveredNextStepStatements: uncoveredCaptureSteps,
    recommendationMismatchSources: briefMatchesCapture
      ? null
      : {
          capture: captureRecommendation,
          brief: briefRecommendation,
        },
  };
}
