import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRODUCT_DECISION_BRIEF } from "../../../data/briefTypes";
import { demoExampleSourceLabel } from "../../../data/demoExamples";
import expectedCaptureLayer from "../../../../fixtures/examples/platform-rearchitecture-review/expected-capture-layer.json";
import expectedDecisionBrief from "../../../../fixtures/examples/platform-rearchitecture-review/expected-decision-brief.md?raw";
import expectedDecisionTrace from "../../../../fixtures/examples/platform-rearchitecture-review/expected-decision-trace.json";
import {
  validateCaptureLayerObject,
  evaluateStructuralReadiness,
} from "../../../evaluation/captureLayerChecks";
import { evaluateArtifactAlignment } from "../../../evaluation/pipeline/alignmentChecks";
import { evaluateInventedStatedDecision } from "../../../evaluation/pipeline/inventedStatedDecision";
import { STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS } from "../captureLayerStructuralReadiness";
import { generateCaptureLayerForSession } from "../generateCaptureLayer";
import { generateDecisionBriefForSession } from "../generateDecisionBrief";
import { mockModelAdapter } from "../mockModelAdapter";
import { planLongInput } from "./planLongInput";

describe("platform-rearchitecture-review long-input mock path", () => {
  const rawNotes = readFileSync(
    "fixtures/examples/platform-rearchitecture-review/messy-notes.md",
    "utf8",
  );
  const sourceLabel = demoExampleSourceLabel("platform-rearchitecture-review");

  it("merges chunk signals into a validated Capture Layer through session orchestration", async () => {
    const captureLayer = await generateCaptureLayerForSession({
      rawInputText: rawNotes,
      briefType: PRODUCT_DECISION_BRIEF,
      sourceLabel,
      mode: "mock",
    });

    const schema = validateCaptureLayerObject(captureLayer);
    expect(schema.schemaPass, schema.error ?? undefined).toBe(true);

    const structural = evaluateStructuralReadiness(
      captureLayer,
      STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS,
    );
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

  it("uses hierarchical merge rather than the direct fixture adapter shortcut", async () => {
    const mergedCaptureLayer = await generateCaptureLayerForSession({
      rawInputText: rawNotes,
      briefType: PRODUCT_DECISION_BRIEF,
      sourceLabel,
      mode: "mock",
    });

    const directCaptureLayer = await mockModelAdapter.generateCaptureLayer({
      rawInputText: rawNotes,
      briefType: PRODUCT_DECISION_BRIEF,
      briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
      captureLayerFields: Object.keys(expectedCaptureLayer),
      sourceLabel,
    });

    expect(planLongInput(rawNotes).chunks.length).toBeGreaterThan(1);
    expect(mergedCaptureLayer.source_summary).not.toBe(
      directCaptureLayer.source_summary,
    );

    const { markdown, decisionTrace } = await generateDecisionBriefForSession({
      captureLayer: mergedCaptureLayer,
      briefType: PRODUCT_DECISION_BRIEF,
      sourceLabel,
      adapter: mockModelAdapter,
    });

    expect(markdown).toBe(expectedDecisionBrief.trim());
    expect(decisionTrace).toEqual(expectedDecisionTrace);

    const alignment = evaluateArtifactAlignment({
      captureLayer: mergedCaptureLayer,
      decisionTrace,
      briefMarkdown: markdown,
    });
    expect(alignment.recommendationAlignmentPass).toBe(true);
    expect(alignment.nextStepAlignmentPass).toBe(true);
  });

  it("plans more than one chunk for the fixture", () => {
    const plan = planLongInput(rawNotes);
    expect(plan.strategy).toBe("hierarchical");
    expect(plan.chunks.length).toBeGreaterThan(1);
  });
});
