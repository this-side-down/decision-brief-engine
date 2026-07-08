import type { CaptureLayer } from "../types/captureLayer";
import { parseCaptureLayerJson } from "../services/generation/parseCaptureLayer";
import type {
  SchemaCheckResult,
  StructuralCheck,
  StructuralExpectation,
  StructuralReadinessResult,
} from "./types";

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/**
 * Schema gate used before any product-quality judgment.
 * Prefer validating a CaptureLayer object already returned by an adapter;
 * use validateCaptureLayerJsonText when only raw model text is available.
 */
export function validateCaptureLayerJsonText(
  jsonText: string,
): SchemaCheckResult & { captureLayer: CaptureLayer | null } {
  const stripped = stripJsonFences(jsonText);

  try {
    JSON.parse(stripped);
  } catch {
    return {
      validJson: false,
      schemaPass: false,
      error: "Capture Layer response was not valid JSON.",
      captureLayer: null,
    };
  }

  try {
    const captureLayer = parseCaptureLayerJson(jsonText);
    return {
      validJson: true,
      schemaPass: true,
      error: null,
      captureLayer,
    };
  } catch (error) {
    return {
      validJson: true,
      schemaPass: false,
      error: error instanceof Error ? error.message : String(error),
      captureLayer: null,
    };
  }
}

export function validateCaptureLayerObject(
  value: unknown,
): SchemaCheckResult & { captureLayer: CaptureLayer | null } {
  try {
    return validateCaptureLayerJsonText(JSON.stringify(value));
  } catch (error) {
    return {
      validJson: false,
      schemaPass: false,
      error: error instanceof Error ? error.message : String(error),
      captureLayer: null,
    };
  }
}

function check(id: string, pass: boolean, detail: string): StructuralCheck {
  return { id, pass, detail };
}

/**
 * Lightweight automated readiness checks that mirror product-quality dimensions
 * from the manual scorecard without scoring content quality.
 *
 * A Capture Layer may be schema-valid but still not ready for Decision Brief
 * generation if decision/options/risks/questions are hollow.
 */
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

/**
 * Automated proceed-to-brief gate used by the harness.
 * Schema validity is required before structural readiness is considered.
 */
export function decideProceedToBrief(options: {
  schemaPass: boolean;
  structuralPass: boolean;
}): boolean {
  return options.schemaPass && options.structuralPass;
}
