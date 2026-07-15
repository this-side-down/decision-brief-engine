import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXECUTION_DECISION_BRIEF, PRODUCT_DECISION_BRIEF } from "../../../data/briefTypes";
import { demoExampleSourceLabel } from "../../../data/demoExamples";
import {
  evaluateStructuralReadiness,
  validateCaptureLayerObject,
} from "../../../evaluation/captureLayerChecks";
import { evaluateInventedStatedDecision } from "../../../evaluation/pipeline/inventedStatedDecision";
import { loadEvaluationFixtureInput } from "../../../evaluation/pipeline/loadCaseInput";
import {
  GENERIC_MOCK_STRUCTURAL_EXPECTATIONS,
  STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS,
} from "../captureLayerStructuralReadiness";
import { mockLongInputCaptureCapability } from "./mockChunkExtractor";
import { runLongInputCapture } from "./runLongInputCapture";

describe("#155 long-form fixture hygiene", () => {
  it("keeps platform stated_decision empty with complete, ready capture", async () => {
    const rawInputText = readFileSync(
      "fixtures/examples/platform-rearchitecture-review/messy-notes.md",
      "utf8",
    );
    const result = await runLongInputCapture({
      input: {
        rawInputText,
        briefType: PRODUCT_DECISION_BRIEF,
        briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
        captureLayerFields: [],
        sourceLabel: demoExampleSourceLabel("platform-rearchitecture-review"),
      },
      capability: mockLongInputCaptureCapability,
    });

    expect(result.diagnostics.sourceCoverageComplete).toBe(true);
    expect(validateCaptureLayerObject(result.captureLayer).schemaPass).toBe(true);
    expect(
      evaluateStructuralReadiness(
        result.captureLayer,
        STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS,
      ).pass,
    ).toBe(true);
    expect(result.captureLayer.stated_decision).toBe("");
    expect(
      evaluateInventedStatedDecision({
        captureLayer: result.captureLayer,
        expectEmptyStatedDecision: true,
      }).pass,
    ).toBe(true);
  });

  it("retains regional's explicit pilot decision with complete, ready capture", async () => {
    const loaded = loadEvaluationFixtureInput(
      "fixtures/evaluation/regional-launch-readiness-review.md",
      process.cwd(),
    );
    const result = await runLongInputCapture({
      input: {
        rawInputText: loaded.rawInputText,
        briefType: EXECUTION_DECISION_BRIEF,
        briefTypeGuidance: EXECUTION_DECISION_BRIEF.guidance,
        captureLayerFields: [],
        sourceLabel: "eval-harness:regional-launch-readiness-review",
      },
      capability: mockLongInputCaptureCapability,
    });

    expect(result.diagnostics.sourceCoverageComplete).toBe(true);
    expect(validateCaptureLayerObject(result.captureLayer).schemaPass).toBe(true);
    expect(
      evaluateStructuralReadiness(
        result.captureLayer,
        GENERIC_MOCK_STRUCTURAL_EXPECTATIONS,
      ).pass,
    ).toBe(true);
    expect(result.captureLayer.stated_decision).toMatch(/limited pilot/i);
    expect(result.captureLayer.stated_decision).toMatch(/April 14/i);
    expect(result.captureLayer.stated_decision).toMatch(/12 accounts/i);
    expect(
      evaluateInventedStatedDecision({
        captureLayer: result.captureLayer,
        expectEmptyStatedDecision: false,
      }).pass,
    ).toBe(true);
  });
});
