import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRODUCT_DECISION_BRIEF } from "../../../data/briefTypes";
import { demoExampleSourceLabel } from "../../../data/demoExamples";
import expectedCaptureLayer from "../../../../fixtures/examples/platform-rearchitecture-review/expected-capture-layer.json";
import { validateCaptureLayerObject, evaluateStructuralReadiness } from "../../../evaluation/captureLayerChecks";
import { evaluateInventedStatedDecision } from "../../../evaluation/pipeline/inventedStatedDecision";
import { mockLongInputCaptureCapability } from "./mockChunkExtractor";
import { planLongInput } from "./planLongInput";
import { runLongInputCapture } from "./runLongInputCapture";

describe("platform-rearchitecture-review long-input mock path", () => {
  const rawNotes = readFileSync(
    "fixtures/examples/platform-rearchitecture-review/messy-notes.md",
    "utf8",
  );

  it("merges chunk signals into a validated Capture Layer fixture", async () => {
    const captureLayer = await runLongInputCapture({
      input: {
        rawInputText: rawNotes,
        briefType: PRODUCT_DECISION_BRIEF,
        briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
        captureLayerFields: Object.keys(expectedCaptureLayer),
        sourceLabel: demoExampleSourceLabel("platform-rearchitecture-review"),
      },
      capability: mockLongInputCaptureCapability,
    });

    const schema = validateCaptureLayerObject(captureLayer);
    expect(schema.schemaPass, schema.error ?? undefined).toBe(true);

    const structural = evaluateStructuralReadiness(captureLayer, {
      requireStatedOrImpliedDecision: true,
      minOptions: 3,
      minStakeholders: 4,
      minRisks: 3,
      minAssumptions: 2,
      minOpenQuestions: 3,
      minMissingContext: 2,
      requireRecommendationCandidate: true,
    });
    expect(structural.pass, JSON.stringify(structural.checks)).toBe(true);

    const invented = evaluateInventedStatedDecision({
      captureLayer,
      expectEmptyStatedDecision: true,
    });
    expect(invented.pass).toBe(true);
    expect(captureLayer.stated_decision.trim()).toBe("");
    expect(captureLayer.evidence.length).toBeGreaterThanOrEqual(5);
    expect(captureLayer.missing_context.join(" ")).toContain("Helix");
    expect(captureLayer.tensions.join(" ")).toMatch(/Omar/i);
    expect(captureLayer.recommendation_candidate).toBe(
      expectedCaptureLayer.recommendation_candidate,
    );
  });

  it("plans more than one chunk for the fixture", () => {
    const plan = planLongInput(rawNotes);
    expect(plan.strategy).toBe("hierarchical");
    expect(plan.chunks.length).toBeGreaterThan(1);
  });
});
