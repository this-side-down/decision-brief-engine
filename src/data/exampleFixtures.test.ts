import { describe, expect, it } from "vitest";
import { validateCaptureLayerObject } from "../evaluation/captureLayerChecks";
import { evaluateStructuralReadiness } from "../evaluation/captureLayerChecks";
import { EXAMPLE_FIXTURES } from "./exampleFixtures";

const DEFAULT_STRUCTURAL_EXPECTATIONS = {
  requireStatedOrImpliedDecision: true,
  minOptions: 3,
  minStakeholders: 4,
  minRisks: 3,
  minAssumptions: 2,
  minOpenQuestions: 3,
  minMissingContext: 2,
  requireRecommendationCandidate: true,
};

describe("exampleFixtures", () => {
  it("includes three durable public demo examples", () => {
    expect(EXAMPLE_FIXTURES).toHaveLength(3);
    expect(EXAMPLE_FIXTURES.map((fixture) => fixture.metadata.id).sort()).toEqual(
      [
        "household-move-planning",
        "local-inference-setup-flow",
        "q4-workforce-allocation",
      ],
    );
  });

  it("has valid metadata, raw notes, and expected capture layers", () => {
    for (const fixture of EXAMPLE_FIXTURES) {
      expect(fixture.metadata.title.trim().length).toBeGreaterThan(0);
      expect(fixture.metadata.description.trim().length).toBeGreaterThan(0);
      expect(fixture.rawNotes.trim().length).toBeGreaterThan(100);
      expect(fixture.expectedDecisionBrief.trim().length).toBeGreaterThan(100);

      const schema = validateCaptureLayerObject(fixture.expectedCaptureLayer);
      expect(schema.schemaPass, schema.error ?? undefined).toBe(true);

      const structural = evaluateStructuralReadiness(
        fixture.expectedCaptureLayer,
        DEFAULT_STRUCTURAL_EXPECTATIONS,
      );
      expect(structural.pass, JSON.stringify(structural.checks)).toBe(true);
    }
  });
});
