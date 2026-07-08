import { describe, expect, it } from "vitest";
import {
  EXECUTION_DECISION_BRIEF,
  PRODUCT_DECISION_BRIEF,
  STRATEGY_DECISION_BRIEF,
} from "../../data/briefTypes";
import { demoExampleSourceLabel } from "../../data/demoExamples";
import executionNotes from "../../../fixtures/raw-inputs/execution-planning.md?raw";
import productNotes from "../../../fixtures/raw-inputs/product-prioritization.md?raw";
import { CAPTURE_LAYER_FIELDS } from "./types";
import { mockModelAdapter } from "./mockModelAdapter";

describe("mockModelAdapter demo examples", () => {
  it("returns example-specific capture layers for demo source labels", async () => {
    const product = await mockModelAdapter.generateCaptureLayer({
      rawInputText: productNotes,
      briefType: PRODUCT_DECISION_BRIEF,
      briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
      captureLayerFields: [...CAPTURE_LAYER_FIELDS],
      sourceLabel: demoExampleSourceLabel("product-prioritization"),
    });

    expect(product.stated_decision).toContain("next sprint");
    expect(product.options_considered.length).toBeGreaterThanOrEqual(3);
    expect(product.recommendation_candidate).toContain("onboarding");

    const execution = await mockModelAdapter.generateCaptureLayer({
      rawInputText: executionNotes,
      briefType: EXECUTION_DECISION_BRIEF,
      briefTypeGuidance: EXECUTION_DECISION_BRIEF.guidance,
      captureLayerFields: [...CAPTURE_LAYER_FIELDS],
      sourceLabel: demoExampleSourceLabel("execution-planning"),
    });

    expect(execution.stated_decision.toLowerCase()).toContain("sequencing");
    expect(execution.options_considered).toHaveLength(3);
    expect(execution.recommendation_candidate.toLowerCase()).toContain(
      "rollout",
    );

    const strategy = await mockModelAdapter.generateCaptureLayer({
      rawInputText: "specialty trades and gc workforce planning notes",
      briefType: STRATEGY_DECISION_BRIEF,
      briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
      captureLayerFields: [...CAPTURE_LAYER_FIELDS],
      sourceLabel: demoExampleSourceLabel("construction-strategy"),
    });

    expect(strategy.options_considered.length).toBeGreaterThanOrEqual(3);
    expect(strategy.recommendation_candidate).toContain("discovery pilot");
  });
});
