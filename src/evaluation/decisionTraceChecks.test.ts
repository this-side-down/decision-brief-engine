import { describe, expect, it } from "vitest";
import { EXAMPLE_FIXTURES } from "../data/exampleFixtures";
import type { CaptureLayer } from "../types/captureLayer";
import type { DecisionTrace, DecisionTraceEntry } from "../types/decisionTrace";
import { evaluateDecisionTraceReadiness } from "./decisionTraceChecks";

const BASE_CAPTURE_LAYER: CaptureLayer = {
  source_summary: "s",
  decision_context: "d",
  stated_decision: "Decide X",
  implied_decision: "",
  goals: ["Ship the feature safely"],
  stakeholders: ["Owner"],
  options_considered: ["Option A", "Option B"],
  constraints: ["Budget is fixed"],
  risks: ["Users may churn"],
  assumptions: ["Demand is stable"],
  evidence: ["Usage grew 10% last quarter"],
  open_questions: ["Is the budget final?"],
  tensions: ["Speed versus quality"],
  recommendation_candidate: "Ship option A",
  confidence: "Medium",
  missing_context: ["Final budget confirmation"],
  suggested_next_steps: ["Confirm budget with finance"],
};

function baseEntry(overrides: Partial<DecisionTraceEntry> = {}): DecisionTraceEntry {
  return {
    statement: "Ship option A",
    kind: "recommendation",
    basis: {
      intent: "Ship the feature safely",
      supporting_evidence: ["Usage grew 10% last quarter"],
      assumptions_relied_on: [],
      risks_addressed: [],
      risks_accepted: [],
      constraints_respected: [],
      tradeoffs: [],
      alternatives_considered: [],
      missing_context_caveats: [],
    },
    confidence: "Medium",
    would_change_if: ["If usage growth reverses in the next quarter."],
    ...overrides,
  };
}

function baseNextStepEntry(overrides: Partial<DecisionTraceEntry> = {}): DecisionTraceEntry {
  return baseEntry({
    statement: "Confirm budget with finance",
    kind: "next_step",
    ...overrides,
  });
}

function trace(entries: DecisionTraceEntry[]): DecisionTrace {
  return { entries, created_at: "2026-01-01T00:00:00.000Z" };
}

describe("evaluateDecisionTraceReadiness — coverage", () => {
  it("passes when recommendation and next_step counts match the Capture Layer", () => {
    const result = evaluateDecisionTraceReadiness(
      BASE_CAPTURE_LAYER,
      trace([baseEntry(), baseNextStepEntry()]),
    );
    expect(result.pass, JSON.stringify(result.checks)).toBe(true);
  });

  it("fails recommendation_coverage when recommendation_candidate is non-empty but no recommendation entry exists", () => {
    const result = evaluateDecisionTraceReadiness(
      BASE_CAPTURE_LAYER,
      trace([baseNextStepEntry()]),
    );
    const check = result.checks.find((c) => c.id === "recommendation_coverage");
    expect(check?.pass).toBe(false);
    expect(result.pass).toBe(false);
  });

  it("fails recommendation_coverage when a recommendation entry exists but its statement does not correspond to recommendation_candidate", () => {
    const mismatched = baseEntry({ statement: "Do something completely unrelated" });
    const result = evaluateDecisionTraceReadiness(
      BASE_CAPTURE_LAYER,
      trace([mismatched, baseNextStepEntry()]),
    );
    const check = result.checks.find((c) => c.id === "recommendation_coverage");
    expect(check?.pass).toBe(false);
    expect(check?.detail).toContain("no recommendation entry statement corresponds");
    expect(result.pass).toBe(false);
  });

  it("passes recommendation_coverage when a recommendation entry statement corresponds to recommendation_candidate", () => {
    const result = evaluateDecisionTraceReadiness(
      BASE_CAPTURE_LAYER,
      trace([baseEntry(), baseNextStepEntry()]),
    );
    const check = result.checks.find((c) => c.id === "recommendation_coverage");
    expect(check?.pass).toBe(true);
  });

  it("skips recommendation_coverage when recommendation_candidate is empty", () => {
    const captureLayer = { ...BASE_CAPTURE_LAYER, recommendation_candidate: "" };
    const result = evaluateDecisionTraceReadiness(captureLayer, trace([baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "recommendation_coverage");
    expect(check?.pass).toBe(true);
  });

  it("fails next_step_count when the next_step entry count does not match suggested_next_steps", () => {
    const captureLayer = {
      ...BASE_CAPTURE_LAYER,
      suggested_next_steps: ["Step one", "Step two"],
    };
    const result = evaluateDecisionTraceReadiness(captureLayer, trace([baseEntry(), baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "next_step_count");
    expect(check?.pass).toBe(false);
  });

  it("passes next_step_count when there are zero suggested next steps and zero next_step entries", () => {
    const captureLayer = { ...BASE_CAPTURE_LAYER, suggested_next_steps: [] };
    const result = evaluateDecisionTraceReadiness(captureLayer, trace([baseEntry()]));
    const check = result.checks.find((c) => c.id === "next_step_count");
    expect(check?.pass).toBe(true);
  });

  it("fails next_step_statement_coverage when the count matches but a next-step statement does not correspond to any suggested_next_steps item", () => {
    const captureLayer = {
      ...BASE_CAPTURE_LAYER,
      suggested_next_steps: ["Confirm budget with finance", "Notify the team lead"],
    };
    const mismatched = baseNextStepEntry({ statement: "Confirm budget with finance" });
    const unrelated = baseNextStepEntry({ statement: "Order new office chairs" });
    const result = evaluateDecisionTraceReadiness(
      captureLayer,
      trace([baseEntry(), mismatched, unrelated]),
    );

    const countCheck = result.checks.find((c) => c.id === "next_step_count");
    expect(countCheck?.pass).toBe(true);

    const coverageCheck = result.checks.find((c) => c.id === "next_step_statement_coverage");
    expect(coverageCheck?.pass).toBe(false);
    expect(coverageCheck?.detail).toContain("Notify the team lead");
    expect(result.pass).toBe(false);
  });

  it("passes next_step_statement_coverage when every suggested_next_steps item has a corresponding entry statement", () => {
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([baseEntry(), baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "next_step_statement_coverage");
    expect(check?.pass).toBe(true);
  });
});

describe("evaluateDecisionTraceReadiness — entry completeness", () => {
  it("fails entries_have_intent when basis.intent is empty", () => {
    const entry = baseEntry({
      basis: { ...baseEntry().basis, intent: "" },
    });
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([entry, baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "entries_have_intent");
    expect(check?.pass).toBe(false);
  });

  it("fails entries_have_confidence when confidence is invalid", () => {
    const entry = baseEntry({ confidence: "Maybe" as DecisionTraceEntry["confidence"] });
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([entry, baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "entries_have_confidence");
    expect(check?.pass).toBe(false);
  });

  it("fails entries_have_non_empty_basis when every basis array is empty", () => {
    const entry = baseEntry({
      basis: {
        intent: "Ship the feature safely",
        supporting_evidence: [],
        assumptions_relied_on: [],
        risks_addressed: [],
        risks_accepted: [],
        constraints_respected: [],
        tradeoffs: [],
        alternatives_considered: [],
        missing_context_caveats: [],
      },
    });
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([entry, baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "entries_have_non_empty_basis");
    expect(check?.pass).toBe(false);
  });

  it("passes entries_have_non_empty_basis when at least one basis array is non-empty", () => {
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([baseEntry(), baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "entries_have_non_empty_basis");
    expect(check?.pass).toBe(true);
  });
});

describe("evaluateDecisionTraceReadiness — would_change_if usefulness", () => {
  it("fails would_change_if_specific when the array is empty", () => {
    const entry = baseEntry({ would_change_if: [] });
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([entry, baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "would_change_if_specific");
    expect(check?.pass).toBe(false);
  });

  it.each([
    "if the situation changes",
    "If circumstances change.",
    "if new information becomes available",
  ])("fails would_change_if_specific on generic condition: %s", (generic) => {
    const entry = baseEntry({ would_change_if: [generic] });
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([entry, baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "would_change_if_specific");
    expect(check?.pass).toBe(false);
  });

  it("passes would_change_if_specific for a specific, named condition", () => {
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([baseEntry(), baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "would_change_if_specific");
    expect(check?.pass).toBe(true);
  });
});

describe("evaluateDecisionTraceReadiness — groundedness", () => {
  it("fails intent_grounded_in_goals when intent does not correspond to any goal", () => {
    const entry = baseEntry({
      basis: { ...baseEntry().basis, intent: "Invented goal not in the Capture Layer" },
    });
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([entry, baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "intent_grounded_in_goals");
    expect(check?.pass).toBe(false);
  });

  it("fails basis_grounded_in_capture_layer when a basis item is invented", () => {
    const entry = baseEntry({
      basis: {
        ...baseEntry().basis,
        supporting_evidence: ["A completely invented fact not present anywhere in the Capture Layer"],
      },
    });
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([entry, baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "basis_grounded_in_capture_layer");
    expect(check?.pass).toBe(false);
  });

  it("passes basis_grounded_in_capture_layer for verbatim Capture Layer items", () => {
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([baseEntry(), baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "basis_grounded_in_capture_layer");
    expect(check?.pass).toBe(true);
  });

  it("tolerates light paraphrasing via substring containment", () => {
    const entry = baseEntry({
      basis: {
        ...baseEntry().basis,
        supporting_evidence: ["usage grew 10%"],
      },
    });
    const result = evaluateDecisionTraceReadiness(BASE_CAPTURE_LAYER, trace([entry, baseNextStepEntry()]));
    const check = result.checks.find((c) => c.id === "basis_grounded_in_capture_layer");
    expect(check?.pass).toBe(true);
  });
});

describe("evaluateDecisionTraceReadiness — public gallery examples", () => {
  it.each(EXAMPLE_FIXTURES.map((fixture) => [fixture.metadata.id, fixture]))(
    "passes structural readiness for %s",
    (_id, fixture) => {
      const result = evaluateDecisionTraceReadiness(
        fixture.expectedCaptureLayer,
        fixture.expectedDecisionTrace,
      );
      expect(result.pass, JSON.stringify(result.checks.filter((c) => !c.pass))).toBe(true);
    },
  );

  it("every gallery example has at least one recommendation entry and one entry per suggested next step", () => {
    for (const fixture of EXAMPLE_FIXTURES) {
      const { expectedCaptureLayer, expectedDecisionTrace } = fixture;
      const recommendationEntries = expectedDecisionTrace.entries.filter(
        (e) => e.kind === "recommendation",
      );
      const nextStepEntries = expectedDecisionTrace.entries.filter(
        (e) => e.kind === "next_step",
      );

      expect(recommendationEntries.length).toBeGreaterThanOrEqual(1);
      expect(nextStepEntries).toHaveLength(expectedCaptureLayer.suggested_next_steps.length);
    }
  });
});
