import type { CaptureLayerEvalCase } from "./types";

/** Default Capture Layer evaluation case: built-in construction Strategy example. */
export const CONSTRUCTION_STRATEGY_EVAL_CASE: CaptureLayerEvalCase = {
  id: "construction-strategy",
  name: "Construction workforce planning (Strategy)",
  rawInputPath: "fixtures/examples/specialty-trades-expansion/messy-notes.md",
  briefTypeId: "strategy",
  sourceLabel: "Construction workforce planning example",
  fixtureDocPath: "fixtures/evaluation/strategy-tradeoff.md",
  structuredReferencePath:
    "fixtures/construction-workforce-planning/structured-reference.md",
  structuralExpectations: {
    requireStatedOrImpliedDecision: true,
    minOptions: 3,
    minStakeholders: 4,
    minRisks: 3,
    minAssumptions: 2,
    minOpenQuestions: 3,
    minMissingContext: 2,
    requireRecommendationCandidate: true,
  },
};

export const DEFAULT_CAPTURE_LAYER_EVAL_CASES: CaptureLayerEvalCase[] = [
  CONSTRUCTION_STRATEGY_EVAL_CASE,
];

export function getCaptureLayerEvalCase(
  caseId: string,
): CaptureLayerEvalCase | undefined {
  return DEFAULT_CAPTURE_LAYER_EVAL_CASES.find((item) => item.id === caseId);
}
