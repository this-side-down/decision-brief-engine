import { describe, expect, it } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../data/briefTypes";
import type { CaptureLayer } from "../types/captureLayer";
import { formatCaptureLayerSummarySignals } from "./captureLayerSummarySignals";

function makeCaptureLayer(overrides: Partial<CaptureLayer> = {}): CaptureLayer {
  return {
    source_summary: "summary",
    decision_context: "context",
    stated_decision: "stated",
    implied_decision: "implied",
    goals: [],
    stakeholders: [],
    options_considered: [],
    constraints: [],
    risks: [],
    assumptions: [],
    evidence: [],
    open_questions: [],
    tensions: [],
    recommendation_candidate: "candidate",
    confidence: "Medium",
    missing_context: [],
    suggested_next_steps: [],
    ...overrides,
  };
}

describe("formatCaptureLayerSummarySignals", () => {
  it("singularizes counts of exactly one", () => {
    const captureLayer = makeCaptureLayer({
      goals: ["one goal"],
      constraints: ["one constraint"],
      risks: ["one risk"],
    });

    expect(formatCaptureLayerSummarySignals(STRATEGY_DECISION_BRIEF, captureLayer)).toBe(
      "Strategy Decision Brief · 1 goal · 1 constraint · 1 risk · Medium confidence",
    );
  });

  it("pluralizes counts greater than one", () => {
    const captureLayer = makeCaptureLayer({
      goals: ["a", "b"],
      constraints: ["a", "b", "c"],
      risks: ["a", "b", "c", "d"],
      confidence: "Medium",
    });

    expect(formatCaptureLayerSummarySignals(STRATEGY_DECISION_BRIEF, captureLayer)).toBe(
      "Strategy Decision Brief · 2 goals · 3 constraints · 4 risks · Medium confidence",
    );
  });

  it("pluralizes a zero count", () => {
    const captureLayer = makeCaptureLayer();

    expect(formatCaptureLayerSummarySignals(STRATEGY_DECISION_BRIEF, captureLayer)).toBe(
      "Strategy Decision Brief · 0 goals · 0 constraints · 0 risks · Medium confidence",
    );
  });

  it("reflects the given confidence level", () => {
    const captureLayer = makeCaptureLayer({ confidence: "High" });

    expect(formatCaptureLayerSummarySignals(STRATEGY_DECISION_BRIEF, captureLayer)).toContain(
      "High confidence",
    );
  });

  it("omits the decision type clause when briefType is null", () => {
    const captureLayer = makeCaptureLayer({
      goals: ["a"],
      constraints: [],
      risks: [],
    });

    expect(formatCaptureLayerSummarySignals(null, captureLayer)).toBe(
      "1 goal · 0 constraints · 0 risks · Medium confidence",
    );
  });

  it("does not include full field text, only counts and labels", () => {
    const captureLayer = makeCaptureLayer({
      goals: ["Grow market share substantially over the next fiscal year"],
      stated_decision: "A very long stated decision that should never appear in the summary",
    });

    const summary = formatCaptureLayerSummarySignals(STRATEGY_DECISION_BRIEF, captureLayer);

    expect(summary).not.toContain("Grow market share");
    expect(summary).not.toContain("stated decision");
  });
});
