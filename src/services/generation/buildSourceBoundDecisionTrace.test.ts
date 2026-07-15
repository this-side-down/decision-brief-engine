import { describe, expect, it } from "vitest";
import type { CaptureLayer } from "../../types/captureLayer";
import { DECISION_TRACE_BASIS_ARRAY_FIELDS } from "./parseDecisionTrace";
import {
  buildSourceBoundDecisionTrace,
  SourceBoundDecisionTraceConstructionError,
} from "./buildSourceBoundDecisionTrace";

function buildCaptureLayer(overrides: Partial<CaptureLayer> = {}): CaptureLayer {
  return {
    source_summary: "Q4 hospital project requires senior engineering staffing.",
    decision_context:
      "Engineering leadership must allocate senior engineers before the fixed Q4 hospital deadline.",
    stated_decision: "",
    implied_decision: "Senior engineers should move onto the hospital project.",
    goals: [
      "Deliver the hospital project on the fixed Q4 deadline.",
      "Keep the platform team staffed through year end.",
    ],
    stakeholders: ["Engineering leadership", "Hospital client"],
    options_considered: [
      "Reassign senior engineers from the platform team to the hospital project.",
      "Hire contractors for the hospital project instead.",
    ],
    constraints: ["The Q4 hospital deadline is fixed and cannot move."],
    risks: ["The platform team may fall behind without senior engineers."],
    assumptions: ["Contractors would need several weeks to ramp up on the hospital project."],
    evidence: ["The hospital contract specifies a fixed Q4 delivery date."],
    open_questions: ["Will the platform roadmap slip if senior engineers move to the hospital project?"],
    tensions: ["Hospital delivery speed versus platform team continuity."],
    recommendation_candidate: "Reassign senior engineers to the hospital project through Q4.",
    confidence: "Medium",
    missing_context: ["Current contractor ramp-up time for the hospital project is not confirmed."],
    suggested_next_steps: [
      "Confirm contractor availability for the platform team.",
      "Notify the hospital client of the staffing plan.",
    ],
    ...overrides,
  };
}

describe("buildSourceBoundDecisionTrace", () => {
  it("produces a recommendation entry whose statement exactly equals recommendation_candidate", () => {
    const captureLayer = buildCaptureLayer();
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    const recommendationEntry = trace.entries.find((entry) => entry.kind === "recommendation");

    expect(recommendationEntry?.statement).toBe(captureLayer.recommendation_candidate);
  });

  const OVERLAPPING_NEXT_STEPS = [
    "Confirm contractor availability for the hospital project.",
    "Notify the platform team about the staffing plan.",
    "Review the hospital contract delivery date.",
  ];

  it("produces exactly one next_step entry per suggested_next_steps item", () => {
    const captureLayer = buildCaptureLayer({
      suggested_next_steps: OVERLAPPING_NEXT_STEPS,
    });
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    const nextStepEntries = trace.entries.filter((entry) => entry.kind === "next_step");
    expect(nextStepEntries).toHaveLength(captureLayer.suggested_next_steps.length);
  });

  it("preserves next-step order and exact text, with the recommendation entry first", () => {
    const captureLayer = buildCaptureLayer({
      suggested_next_steps: OVERLAPPING_NEXT_STEPS,
    });
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    expect(trace.entries[0].kind).toBe("recommendation");
    expect(trace.entries.slice(1).map((entry) => entry.statement)).toEqual(
      captureLayer.suggested_next_steps,
    );
  });

  it("selects the intent goal most lexically relevant to the entry statement", () => {
    const captureLayer = buildCaptureLayer({
      goals: [
        "Deliver the hospital project on the fixed Q4 deadline.",
        "Confirm contractor availability across every workstream.",
      ],
      suggested_next_steps: ["Confirm contractor availability for the platform team."],
    });
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    const nextStepEntry = trace.entries.find((entry) => entry.kind === "next_step");
    expect(nextStepEntry?.basis.intent).toBe(
      "Confirm contractor availability across every workstream.",
    );
  });

  it("falls back to the first non-empty goal when no goal has lexical overlap with the statement", () => {
    const captureLayer = buildCaptureLayer({
      goals: ["Improve office coffee quality.", "Reduce printer downtime."],
    });
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    for (const entry of trace.entries) {
      expect(entry.basis.intent).toBe("Improve office coffee quality.");
    }
  });

  it("only includes basis values that exist exactly in their mapped Capture Layer field", () => {
    const captureLayer = buildCaptureLayer();
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    const basisFieldToSource: Record<string, readonly string[]> = {
      supporting_evidence: captureLayer.evidence,
      assumptions_relied_on: captureLayer.assumptions,
      risks_addressed: captureLayer.risks,
      risks_accepted: captureLayer.risks,
      constraints_respected: captureLayer.constraints,
      tradeoffs: captureLayer.tensions,
      alternatives_considered: captureLayer.options_considered,
      missing_context_caveats: captureLayer.missing_context,
    };

    for (const entry of trace.entries) {
      for (const field of DECISION_TRACE_BASIS_ARRAY_FIELDS) {
        for (const item of entry.basis[field]) {
          expect(basisFieldToSource[field]).toContain(item);
        }
      }
    }
  });

  it("gives every entry at least one non-empty basis array", () => {
    const captureLayer = buildCaptureLayer();
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    for (const entry of trace.entries) {
      const hasNonEmptyBasis = DECISION_TRACE_BASIS_ARRAY_FIELDS.some(
        (field) => entry.basis[field].length > 0,
      );
      expect(hasNonEmptyBasis).toBe(true);
    }
  });

  it("builds would_change_if from open_questions first, and never uses a generic condition", () => {
    const captureLayer = buildCaptureLayer({
      open_questions: ["Will the platform roadmap slip?"],
    });
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    for (const entry of trace.entries) {
      expect(entry.would_change_if.length).toBeGreaterThan(0);
      for (const condition of entry.would_change_if) {
        expect(condition).toContain("Will the platform roadmap slip?");
        expect(condition.toLowerCase()).not.toMatch(/if circumstances change|if the situation changes|new information (becomes|is) available/);
      }
    }
  });

  it("falls through to missing_context, then assumptions, then risks when earlier would_change_if sources are empty", () => {
    const onlyAssumptions = buildSourceBoundDecisionTrace(
      buildCaptureLayer({
        open_questions: [],
        missing_context: [],
        assumptions: ["Contractors need weeks to ramp up."],
        risks: ["Platform team falls behind."],
      }),
    );
    expect(onlyAssumptions.entries[0].would_change_if[0]).toContain(
      "Contractors need weeks to ramp up.",
    );

    const onlyRisks = buildSourceBoundDecisionTrace(
      buildCaptureLayer({
        open_questions: [],
        missing_context: [],
        assumptions: [],
        risks: ["Platform team falls behind."],
      }),
    );
    expect(onlyRisks.entries[0].would_change_if[0]).toContain("Platform team falls behind.");
  });

  it("handles empty optional Capture Layer arrays deterministically without inventing filler content", () => {
    const captureLayer = buildCaptureLayer({
      constraints: [],
      tensions: [],
      options_considered: [],
    });
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    for (const entry of trace.entries) {
      expect(entry.basis.constraints_respected).toEqual([]);
      expect(entry.basis.tradeoffs).toEqual([]);
      expect(entry.basis.alternatives_considered).toEqual([]);
      expect(entry.basis.risks_accepted).toEqual([]);
    }
  });

  it("injects a deterministic timestamp when a clock function is provided", () => {
    const captureLayer = buildCaptureLayer();
    const trace = buildSourceBoundDecisionTrace(captureLayer, {
      now: () => "2026-01-01T00:00:00.000Z",
    });

    expect(trace.created_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("produces byte-equivalent entries across two calls with the same input, differing only in timestamp", () => {
    const captureLayer = buildCaptureLayer();

    const first = buildSourceBoundDecisionTrace(captureLayer, { now: () => "2026-01-01T00:00:00.000Z" });
    const second = buildSourceBoundDecisionTrace(captureLayer, { now: () => "2026-06-01T00:00:00.000Z" });

    expect(JSON.stringify(first.entries)).toBe(JSON.stringify(second.entries));
    expect(first.created_at).not.toBe(second.created_at);
  });

  it("stores no hidden reasoning or extra fields — entry shape matches the DecisionTrace contract exactly", () => {
    const captureLayer = buildCaptureLayer();
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    for (const entry of trace.entries) {
      expect(Object.keys(entry).sort()).toEqual(
        ["basis", "confidence", "kind", "statement", "would_change_if"].sort(),
      );
      expect(Object.keys(entry.basis).sort()).toEqual(
        [
          "intent",
          "supporting_evidence",
          "assumptions_relied_on",
          "risks_addressed",
          "risks_accepted",
          "constraints_respected",
          "tradeoffs",
          "alternatives_considered",
          "missing_context_caveats",
        ].sort(),
      );
    }
  });

  it("throws a typed SourceBoundDecisionTraceConstructionError when captureLayer.goals has no non-empty entries", () => {
    const captureLayer = buildCaptureLayer({ goals: ["", "   "] });

    expect(() => buildSourceBoundDecisionTrace(captureLayer)).toThrow(
      SourceBoundDecisionTraceConstructionError,
    );
  });

  it("throws a typed SourceBoundDecisionTraceConstructionError when no would_change_if source text exists", () => {
    const captureLayer = buildCaptureLayer({
      open_questions: [],
      missing_context: [],
      assumptions: [],
      risks: [],
    });

    expect(() => buildSourceBoundDecisionTrace(captureLayer)).toThrow(
      SourceBoundDecisionTraceConstructionError,
    );
  });

  it("throws a typed SourceBoundDecisionTraceConstructionError rather than falling back to a model call when a next step is empty", () => {
    const captureLayer = buildCaptureLayer({ suggested_next_steps: ["Valid step.", "   "] });

    expect(() => buildSourceBoundDecisionTrace(captureLayer)).toThrow(
      SourceBoundDecisionTraceConstructionError,
    );
  });

  it("omits the recommendation entry entirely when recommendation_candidate is empty", () => {
    const captureLayer = buildCaptureLayer({ recommendation_candidate: "" });
    const trace = buildSourceBoundDecisionTrace(captureLayer);

    expect(trace.entries.some((entry) => entry.kind === "recommendation")).toBe(false);
  });
});
