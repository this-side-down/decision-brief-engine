import type { CaptureLayer } from "../../types/captureLayer";
import { mockLongInputCaptureCapability } from "./longInput/mockChunkExtractor";

export type StructuralExpectation = {
  requireStatedOrImpliedDecision: boolean;
  minOptions: number;
  minStakeholders: number;
  minRisks: number;
  minAssumptions: number;
  minOpenQuestions: number;
  minMissingContext: number;
  requireRecommendationCandidate: boolean;
};

export type StructuralCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export type StructuralReadinessResult = {
  pass: boolean;
  checks: StructuralCheck[];
};

export const GENERIC_MOCK_STRUCTURAL_EXPECTATIONS: StructuralExpectation = {
  requireStatedOrImpliedDecision: true,
  minOptions: 2,
  minStakeholders: 3,
  minRisks: 2,
  minAssumptions: 2,
  minOpenQuestions: 2,
  minMissingContext: 2,
  requireRecommendationCandidate: false,
};

export const STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS: StructuralExpectation =
  {
    requireStatedOrImpliedDecision: true,
    minOptions: 3,
    minStakeholders: 4,
    minRisks: 3,
    minAssumptions: 2,
    minOpenQuestions: 3,
    minMissingContext: 2,
    requireRecommendationCandidate: true,
  };

function check(id: string, pass: boolean, detail: string): StructuralCheck {
  return { id, pass, detail };
}

export function evaluateStructuralReadiness(
  captureLayer: CaptureLayer,
  expectations: StructuralExpectation,
): StructuralReadinessResult {
  const checks: StructuralCheck[] = [];

  const hasDecision =
    captureLayer.stated_decision.trim().length > 0 ||
    captureLayer.implied_decision.trim().length > 0;

  checks.push(
    check(
      "decision_present",
      !expectations.requireStatedOrImpliedDecision || hasDecision,
      hasDecision
        ? "stated_decision or implied_decision is non-empty"
        : "both stated_decision and implied_decision are empty",
    ),
  );

  checks.push(
    check(
      "options_count",
      captureLayer.options_considered.length >= expectations.minOptions,
      `${captureLayer.options_considered.length} options (min ${expectations.minOptions})`,
    ),
  );

  checks.push(
    check(
      "stakeholders_count",
      captureLayer.stakeholders.length >= expectations.minStakeholders,
      `${captureLayer.stakeholders.length} stakeholders (min ${expectations.minStakeholders})`,
    ),
  );

  checks.push(
    check(
      "risks_count",
      captureLayer.risks.length >= expectations.minRisks,
      `${captureLayer.risks.length} risks (min ${expectations.minRisks})`,
    ),
  );

  checks.push(
    check(
      "assumptions_count",
      captureLayer.assumptions.length >= expectations.minAssumptions,
      `${captureLayer.assumptions.length} assumptions (min ${expectations.minAssumptions})`,
    ),
  );

  checks.push(
    check(
      "open_questions_count",
      captureLayer.open_questions.length >= expectations.minOpenQuestions,
      `${captureLayer.open_questions.length} open questions (min ${expectations.minOpenQuestions})`,
    ),
  );

  checks.push(
    check(
      "missing_context_count",
      captureLayer.missing_context.length >= expectations.minMissingContext,
      `${captureLayer.missing_context.length} missing-context items (min ${expectations.minMissingContext})`,
    ),
  );

  const hasRecommendation =
    captureLayer.recommendation_candidate.trim().length > 0;

  checks.push(
    check(
      "recommendation_present",
      !expectations.requireRecommendationCandidate || hasRecommendation,
      hasRecommendation
        ? "recommendation_candidate is non-empty"
        : "recommendation_candidate is empty",
    ),
  );

  const confidenceOk = ["High", "Medium", "Low"].includes(
    captureLayer.confidence,
  );

  checks.push(
    check(
      "confidence_present",
      confidenceOk,
      confidenceOk
        ? `confidence=${captureLayer.confidence}`
        : "confidence missing or invalid",
    ),
  );

  return {
    pass: checks.every((item) => item.pass),
    checks,
  };
}

export function formatStructuralReadinessFailures(
  result: StructuralReadinessResult,
): string {
  return result.checks
    .filter((item) => !item.pass)
    .map((item) => `${item.id}: ${item.detail}`)
    .join("; ");
}

export function resolveLongInputStructuralExpectations(
  sourceLabel?: string,
): StructuralExpectation {
  return mockLongInputCaptureCapability.resolveStructuralExpectations(
    sourceLabel,
  );
}
