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
import { evaluateDecisionTraceReadiness } from "../../evaluation/decisionTraceChecks";
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
  "q4-workforce-allocation": STRATEGY_DECISION_BRIEF,
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

      const result = await mockModelAdapter.generateDecisionBrief({
        captureLayer,
        briefType,
        briefTypeGuidance: briefType.guidance,
        markdownStructure: [],
        sourceLabel: demoExampleSourceLabel(fixture.metadata.id),
      });

      expect(result.markdown).toBe(fixture.expectedDecisionBrief);
      expect(result.markdown).not.toMatch(/```/);

      expect(result.decisionTrace).toEqual(fixture.expectedDecisionTrace);

      const traceReadiness = evaluateDecisionTraceReadiness(
        captureLayer,
        result.decisionTrace,
      );
      expect(
        traceReadiness.pass,
        JSON.stringify(traceReadiness.checks.filter((c) => !c.pass)),
      ).toBe(true);
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
      rawInputText:
        "workforce allocation for Q4 — hospital project needs senior superintendent",
      briefType: STRATEGY_DECISION_BRIEF,
      briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
      captureLayerFields: [...CAPTURE_LAYER_FIELDS],
      sourceLabel: demoExampleSourceLabel("q4-workforce-allocation"),
    });

    expect(strategy.options_considered.length).toBeGreaterThanOrEqual(3);
    expect(strategy.recommendation_candidate).toContain("Marcus");
  });

  it("returns example-specific decision brief markdown for demo source labels", async () => {
    const strategyFixture = getExampleFixture("q4-workforce-allocation");
    const strategyResult = await mockModelAdapter.generateDecisionBrief({
      captureLayer: strategyFixture!.expectedCaptureLayer,
      briefType: STRATEGY_DECISION_BRIEF,
      briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
      markdownStructure: [],
      sourceLabel: demoExampleSourceLabel("q4-workforce-allocation"),
    });

    expect(strategyResult.markdown.toLowerCase()).toContain("hospital");
    expect(strategyResult.markdown).toContain("Marcus");

    const productFixture = getExampleFixture("local-inference-setup-flow");
    const productResult = await mockModelAdapter.generateDecisionBrief({
      captureLayer: productFixture!.expectedCaptureLayer,
      briefType: PRODUCT_DECISION_BRIEF,
      briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
      markdownStructure: [],
      sourceLabel: demoExampleSourceLabel("local-inference-setup-flow"),
    });

    expect(productResult.markdown.toLowerCase()).toContain("health-check");
    expect(productResult.markdown.toLowerCase()).toContain("mock generation");
  });

  it("returns a Decision Trace grounded in the Capture Layer for demo examples", async () => {
    const strategyFixture = getExampleFixture("q4-workforce-allocation");
    const strategyResult = await mockModelAdapter.generateDecisionBrief({
      captureLayer: strategyFixture!.expectedCaptureLayer,
      briefType: STRATEGY_DECISION_BRIEF,
      briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
      markdownStructure: [],
      sourceLabel: demoExampleSourceLabel("q4-workforce-allocation"),
    });

    const { decisionTrace } = strategyResult;
    expect(Array.isArray(decisionTrace.entries)).toBe(true);
    expect(decisionTrace.entries.length).toBeGreaterThan(0);

    const recommendationEntries = decisionTrace.entries.filter(
      (e) => e.kind === "recommendation",
    );
    expect(recommendationEntries.length).toBeGreaterThan(0);

    for (const entry of decisionTrace.entries) {
      expect(typeof entry.statement).toBe("string");
      expect(entry.statement.length).toBeGreaterThan(0);
      expect(["recommendation", "next_step"]).toContain(entry.kind);
      expect(["High", "Medium", "Low"]).toContain(entry.confidence);
      expect(Array.isArray(entry.would_change_if)).toBe(true);
      expect(entry.would_change_if.length).toBeGreaterThan(0);
      expect(typeof entry.basis.intent).toBe("string");
      expect(Array.isArray(entry.basis.supporting_evidence)).toBe(true);
      expect(Array.isArray(entry.basis.assumptions_relied_on)).toBe(true);
      expect(Array.isArray(entry.basis.risks_addressed)).toBe(true);
      expect(Array.isArray(entry.basis.risks_accepted)).toBe(true);
      expect(Array.isArray(entry.basis.constraints_respected)).toBe(true);
      expect(Array.isArray(entry.basis.tradeoffs)).toBe(true);
      expect(Array.isArray(entry.basis.alternatives_considered)).toBe(true);
      expect(Array.isArray(entry.basis.missing_context_caveats)).toBe(true);
    }
  });
});

describe("mockModelAdapter fallback would_change_if wording", () => {
  const briefType = STRATEGY_DECISION_BRIEF;

  async function generateFallbackTrace(captureLayerOverrides: Record<string, unknown>) {
    const baseCaptureLayer = {
      source_summary: "Notes about staffing decisions.",
      decision_context: "Q4 staffing pressure across active projects.",
      stated_decision: "Allocate superintendent coverage",
      implied_decision: "",
      goals: ["Staff highest-risk projects"],
      stakeholders: ["VP Operations", "HR", "Safety", "Controls"],
      options_considered: ["Assign Marcus", "Promote Carlos", "Hire contractor"],
      constraints: ["Decision needed before Thursday client call"],
      risks: ["Client escalation", "Training gaps", "Schedule penalties"],
      assumptions: ["Marcus can transition", "Carlos can promote"],
      evidence: ["Hospital client asked for named superintendent"],
      open_questions: [] as string[],
      tensions: ["Hospital urgency versus school penalties"],
      recommendation_candidate: "Assign Marcus to the hospital project.",
      confidence: "Medium",
      missing_context: [] as string[],
      suggested_next_steps: ["Finalize staffing matrix"],
      ...captureLayerOverrides,
    };

    const result = await mockModelAdapter.generateDecisionBrief({
      captureLayer: baseCaptureLayer,
      briefType,
      briefTypeGuidance: briefType.guidance,
      markdownStructure: [],
      sourceLabel: "custom-input",
    });

    return result.decisionTrace;
  }

  it("uses grammatical wording for open questions", async () => {
    const trace = await generateFallbackTrace({
      open_questions: ["What is the confirmed hospital start date?"],
    });

    expect(trace.entries[0]?.would_change_if[0]).toBe(
      'The answer to "What is the confirmed hospital start date?" would change this basis.',
    );
  });

  it("uses grammatical wording for missing context on next steps", async () => {
    const trace = await generateFallbackTrace({
      missing_context: ["Confirmed hospital start date"],
    });

    const nextStep = trace.entries.find((entry) => entry.kind === "next_step");
    expect(nextStep?.would_change_if[0]).toBe(
      'Confirmation of "Confirmed hospital start date" would change this basis.',
    );
  });

  it("uses readable fallbacks when no open questions are available", async () => {
    const trace = await generateFallbackTrace({
      open_questions: [],
    });

    expect(trace.entries[0]?.would_change_if[0]).toBe(
      "Supporting evidence or assumptions changing materially would change this basis.",
    );
  });

  it("uses readable fallbacks when no missing context is available", async () => {
    const trace = await generateFallbackTrace({
      missing_context: [],
    });

    const nextStep = trace.entries.find((entry) => entry.kind === "next_step");
    expect(nextStep?.would_change_if[0]).toBe(
      "Missing context confirmation would change this basis.",
    );
  });
});
