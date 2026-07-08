import { describe, expect, it } from "vitest";
import {
  EXECUTION_DECISION_BRIEF,
  PRODUCT_DECISION_BRIEF,
  STRATEGY_DECISION_BRIEF,
} from "../../data/briefTypes";
import type { BriefType } from "../../types/brief";
import { demoExampleSourceLabel } from "../../data/demoExamples";
import { EXAMPLE_FIXTURES, getExampleFixture } from "../../data/exampleFixtures";
import {
  evaluateStructuralReadiness,
  validateCaptureLayerObject,
} from "../../evaluation/captureLayerChecks";
import { CAPTURE_LAYER_FIELDS } from "./types";
import { mockModelAdapter } from "./mockModelAdapter";

const MOCK_STRUCTURAL_EXPECTATIONS = {
  requireStatedOrImpliedDecision: true,
  minOptions: 3,
  minStakeholders: 4,
  minRisks: 3,
  minAssumptions: 2,
  minOpenQuestions: 3,
  minMissingContext: 2,
  requireRecommendationCandidate: true,
};

const BRIEF_TYPE_BY_EXAMPLE_ID = {
  "specialty-trades-expansion": STRATEGY_DECISION_BRIEF,
  "local-inference-setup-flow": PRODUCT_DECISION_BRIEF,
  "household-move-planning": EXECUTION_DECISION_BRIEF,
} satisfies Record<string, BriefType>;

describe("mockModelAdapter demo gallery mock flow", () => {
  it.each(EXAMPLE_FIXTURES.map((fixture) => [fixture.metadata.id, fixture]))(
    "returns fixture Capture Layer and Decision Brief for %s",
    async (_id, fixture) => {
      const briefType = BRIEF_TYPE_BY_EXAMPLE_ID[fixture.metadata.id];

      const captureLayer = await mockModelAdapter.generateCaptureLayer({
        rawInputText: fixture.rawNotes,
        briefType,
        briefTypeGuidance: briefType.guidance,
        captureLayerFields: [...CAPTURE_LAYER_FIELDS],
        sourceLabel: demoExampleSourceLabel(fixture.metadata.id),
      });

      expect(captureLayer).toEqual(fixture.expectedCaptureLayer);

      const schema = validateCaptureLayerObject(captureLayer);
      expect(schema.schemaPass, schema.error ?? undefined).toBe(true);

      const structural = evaluateStructuralReadiness(
        captureLayer,
        MOCK_STRUCTURAL_EXPECTATIONS,
      );
      expect(structural.pass, JSON.stringify(structural.checks)).toBe(true);

      const decisionBrief = await mockModelAdapter.generateDecisionBrief({
        captureLayer,
        briefType,
        briefTypeGuidance: briefType.guidance,
        markdownStructure: [],
        sourceLabel: demoExampleSourceLabel(fixture.metadata.id),
      });

      expect(decisionBrief).toBe(fixture.expectedDecisionBrief);
      expect(decisionBrief).not.toMatch(/```/);
    },
  );

  it("includes assumptions, missing context, and next steps for Local Inference Setup Flow", async () => {
    const fixture = getExampleFixture("local-inference-setup-flow");
    expect(fixture).toBeDefined();

    const captureLayer = await mockModelAdapter.generateCaptureLayer({
      rawInputText: fixture!.rawNotes,
      briefType: PRODUCT_DECISION_BRIEF,
      briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
      captureLayerFields: [...CAPTURE_LAYER_FIELDS],
      sourceLabel: demoExampleSourceLabel("local-inference-setup-flow"),
    });

    expect(captureLayer.assumptions.length).toBeGreaterThan(0);
    expect(captureLayer.missing_context.length).toBeGreaterThan(0);
    expect(captureLayer.suggested_next_steps.length).toBeGreaterThan(0);
  });
});

describe("mockModelAdapter demo examples", () => {
  it("returns example-specific capture layers for demo source labels", async () => {
    const productFixture = getExampleFixture("local-inference-setup-flow");
    expect(productFixture).toBeDefined();

    const product = await mockModelAdapter.generateCaptureLayer({
      rawInputText: productFixture!.rawNotes,
      briefType: PRODUCT_DECISION_BRIEF,
      briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
      captureLayerFields: [...CAPTURE_LAYER_FIELDS],
      sourceLabel: demoExampleSourceLabel("local-inference-setup-flow"),
    });

    expect(product.stated_decision.toLowerCase()).toContain("local inference");
    expect(product.options_considered.length).toBeGreaterThanOrEqual(3);
    expect(product.recommendation_candidate.toLowerCase()).toContain("health");

    const executionFixture = getExampleFixture("household-move-planning");
    const execution = await mockModelAdapter.generateCaptureLayer({
      rawInputText: executionFixture!.rawNotes,
      briefType: EXECUTION_DECISION_BRIEF,
      briefTypeGuidance: EXECUTION_DECISION_BRIEF.guidance,
      captureLayerFields: [...CAPTURE_LAYER_FIELDS],
      sourceLabel: demoExampleSourceLabel("household-move-planning"),
    });

    expect(execution.stated_decision.toLowerCase()).toContain("sequencing");
    expect(execution.options_considered).toHaveLength(4);
    expect(execution.recommendation_candidate.toLowerCase()).toContain("owner");

    const strategy = await mockModelAdapter.generateCaptureLayer({
      rawInputText: "specialty trades and gc workforce planning notes",
      briefType: STRATEGY_DECISION_BRIEF,
      briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
      captureLayerFields: [...CAPTURE_LAYER_FIELDS],
      sourceLabel: demoExampleSourceLabel("specialty-trades-expansion"),
    });

    expect(strategy.options_considered.length).toBeGreaterThanOrEqual(3);
    expect(strategy.recommendation_candidate).toContain("discovery pilot");
  });

  it("returns example-specific decision brief markdown for demo source labels", async () => {
    const strategyFixture = getExampleFixture("specialty-trades-expansion");
    const strategyBrief = await mockModelAdapter.generateDecisionBrief({
      captureLayer: strategyFixture!.expectedCaptureLayer,
      briefType: STRATEGY_DECISION_BRIEF,
      briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
      markdownStructure: [],
      sourceLabel: demoExampleSourceLabel("specialty-trades-expansion"),
    });

    expect(strategyBrief.toLowerCase()).toContain("specialty trade");
    expect(strategyBrief).toContain("discovery pilot");

    const productFixture = getExampleFixture("local-inference-setup-flow");
    const productBrief = await mockModelAdapter.generateDecisionBrief({
      captureLayer: productFixture!.expectedCaptureLayer,
      briefType: PRODUCT_DECISION_BRIEF,
      briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
      markdownStructure: [],
      sourceLabel: demoExampleSourceLabel("local-inference-setup-flow"),
    });

    expect(productBrief.toLowerCase()).toContain("health-check");
    expect(productBrief.toLowerCase()).toContain("mocked generation");
  });
});
