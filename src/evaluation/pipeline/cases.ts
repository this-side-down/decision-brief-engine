import type { StructuralExpectation } from "../types";
import type { PipelineCaseCategory } from "./resultTypes";

export type PipelineGalleryId =
  | "q4-workforce-allocation"
  | "local-inference-setup-flow"
  | "household-move-planning"
  | "platform-rearchitecture-review";

export type PipelineEvalCase = {
  id: string;
  name: string;
  category: PipelineCaseCategory;
  briefTypeId: "product" | "strategy" | "execution";
  /** Evaluation-fixture markdown path relative to repo root. */
  fixtureDocPath?: string;
  /** Gallery example id when category is gallery-example. */
  galleryId?: PipelineGalleryId;
  /**
   * Adapter sourceLabel passed to generation. Gallery cases use `demo:<id>`
   * so Mock returns authored fixtures. Evaluation fixtures use a harness-only
   * label and do not alter product Mock behavior.
   */
  sourceLabel: string;
  structuralExpectations: StructuralExpectation;
  /** When true, a non-empty stated_decision is treated as invented. */
  expectEmptyStatedDecision: boolean;
};

function demoSourceLabel(exampleId: PipelineGalleryId): string {
  return `demo:${exampleId}`;
}

const STANDARD_STRUCTURAL_EXPECTATIONS: StructuralExpectation = {
  requireStatedOrImpliedDecision: true,
  minOptions: 3,
  minStakeholders: 4,
  minRisks: 3,
  minAssumptions: 2,
  minOpenQuestions: 3,
  minMissingContext: 2,
  requireRecommendationCandidate: true,
};

const EVALUATION_FIXTURE_CASES: PipelineEvalCase[] = [
  {
    id: "product-prioritization",
    name: "Product prioritization meeting",
    category: "evaluation-fixture",
    briefTypeId: "product",
    fixtureDocPath: "fixtures/evaluation/product-prioritization.md",
    sourceLabel: "eval-harness:product-prioritization",
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: false,
  },
  {
    id: "strategy-tradeoff",
    name: "Strategy tradeoff discussion",
    category: "evaluation-fixture",
    briefTypeId: "strategy",
    fixtureDocPath: "fixtures/evaluation/strategy-tradeoff.md",
    sourceLabel: "eval-harness:strategy-tradeoff",
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: false,
  },
  {
    id: "execution-planning",
    name: "Execution planning disagreement",
    category: "evaluation-fixture",
    briefTypeId: "execution",
    fixtureDocPath: "fixtures/evaluation/execution-planning.md",
    sourceLabel: "eval-harness:execution-planning",
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: false,
  },
  {
    id: "customer-interview-synthesis",
    name: "Customer interview synthesis",
    category: "evaluation-fixture",
    briefTypeId: "product",
    fixtureDocPath: "fixtures/evaluation/customer-interview-synthesis.md",
    sourceLabel: "eval-harness:customer-interview-synthesis",
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: false,
  },
  {
    id: "ambiguous-stakeholder-conversation",
    name: "Ambiguous stakeholder conversation",
    category: "evaluation-fixture",
    briefTypeId: "strategy",
    fixtureDocPath: "fixtures/evaluation/ambiguous-stakeholder-conversation.md",
    sourceLabel: "eval-harness:ambiguous-stakeholder-conversation",
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: true,
  },
  {
    id: "regional-launch-readiness-review",
    name: "Regional launch readiness review",
    category: "evaluation-fixture",
    briefTypeId: "execution",
    fixtureDocPath: "fixtures/evaluation/regional-launch-readiness-review.md",
    sourceLabel: "eval-harness:regional-launch-readiness-review",
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: false,
  },
];

const GALLERY_CASES: PipelineEvalCase[] = [
  {
    id: "q4-workforce-allocation",
    name: "Q4 Workforce Allocation",
    category: "gallery-example",
    briefTypeId: "strategy",
    galleryId: "q4-workforce-allocation",
    sourceLabel: demoSourceLabel("q4-workforce-allocation"),
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: false,
  },
  {
    id: "local-inference-setup-flow",
    name: "Local Inference Setup Flow",
    category: "gallery-example",
    briefTypeId: "product",
    galleryId: "local-inference-setup-flow",
    sourceLabel: demoSourceLabel("local-inference-setup-flow"),
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: false,
  },
  {
    id: "household-move-planning",
    name: "Household Move Planning",
    category: "gallery-example",
    briefTypeId: "execution",
    galleryId: "household-move-planning",
    sourceLabel: demoSourceLabel("household-move-planning"),
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: false,
  },
  {
    id: "platform-rearchitecture-review",
    name: "Platform Re-Architecture Review",
    category: "gallery-example",
    briefTypeId: "product",
    galleryId: "platform-rearchitecture-review",
    sourceLabel: demoSourceLabel("platform-rearchitecture-review"),
    structuralExpectations: STANDARD_STRUCTURAL_EXPECTATIONS,
    expectEmptyStatedDecision: true,
  },
];

/** Canonical ten cases for the full-pipeline harness (#126, #147, #151). */
export const PIPELINE_EVAL_CASES: PipelineEvalCase[] = [
  ...EVALUATION_FIXTURE_CASES,
  ...GALLERY_CASES,
];

export const PIPELINE_EVAL_CASE_IDS = PIPELINE_EVAL_CASES.map((item) => item.id);

export function getPipelineEvalCase(
  caseId: string,
): PipelineEvalCase | undefined {
  return PIPELINE_EVAL_CASES.find((item) => item.id === caseId);
}
