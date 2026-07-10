import { describe, expect, it } from "vitest";
import { EXAMPLE_FIXTURES } from "../data/exampleFixtures";
import type { DecisionTrace, DecisionTraceEntry } from "../types/decisionTrace";
import {
  formatTraceableBasisSummary,
  groupDecisionTraceEntriesByKind,
} from "./decisionTraceBasisGrouping";

function makeEntry(kind: DecisionTraceEntry["kind"]): DecisionTraceEntry {
  return {
    statement: `${kind} statement`,
    kind,
    basis: {
      intent: "intent",
      supporting_evidence: [],
      assumptions_relied_on: [],
      risks_addressed: [],
      risks_accepted: [],
      constraints_respected: [],
      tradeoffs: [],
      alternatives_considered: [],
      missing_context_caveats: [],
    },
    confidence: "Medium",
    would_change_if: [],
  };
}

describe("groupDecisionTraceEntriesByKind", () => {
  it("returns null when there is no Decision Trace", () => {
    expect(groupDecisionTraceEntriesByKind(null)).toBeNull();
  });

  it("returns empty groups when the Decision Trace has no entries", () => {
    const emptyTrace: DecisionTrace = { entries: [], created_at: new Date().toISOString() };

    expect(groupDecisionTraceEntriesByKind(emptyTrace)).toEqual({
      recommendations: [],
      nextSteps: [],
    });
  });

  it("groups entries by kind without dropping or duplicating any entry", () => {
    for (const fixture of EXAMPLE_FIXTURES) {
      const trace = fixture.expectedDecisionTrace;
      const groups = groupDecisionTraceEntriesByKind(trace);

      expect(groups).not.toBeNull();
      expect(groups!.recommendations.every((entry) => entry.kind === "recommendation")).toBe(
        true,
      );
      expect(groups!.nextSteps.every((entry) => entry.kind === "next_step")).toBe(true);
      expect(groups!.recommendations.length + groups!.nextSteps.length).toBe(
        trace.entries.length,
      );
    }
  });

  it("preserves entry order within each group", () => {
    const trace: DecisionTrace = {
      created_at: new Date().toISOString(),
      entries: [
        {
          statement: "next step A",
          kind: "next_step",
          basis: {
            intent: "intent",
            supporting_evidence: ["evidence"],
            assumptions_relied_on: [],
            risks_addressed: [],
            risks_accepted: [],
            constraints_respected: [],
            tradeoffs: [],
            alternatives_considered: [],
            missing_context_caveats: [],
          },
          confidence: "Medium",
          would_change_if: ["a specific condition"],
        },
        {
          statement: "recommendation A",
          kind: "recommendation",
          basis: {
            intent: "intent",
            supporting_evidence: ["evidence"],
            assumptions_relied_on: [],
            risks_addressed: [],
            risks_accepted: [],
            constraints_respected: [],
            tradeoffs: [],
            alternatives_considered: [],
            missing_context_caveats: [],
          },
          confidence: "High",
          would_change_if: ["another specific condition"],
        },
        {
          statement: "next step B",
          kind: "next_step",
          basis: {
            intent: "intent",
            supporting_evidence: ["evidence"],
            assumptions_relied_on: [],
            risks_addressed: [],
            risks_accepted: [],
            constraints_respected: [],
            tradeoffs: [],
            alternatives_considered: [],
            missing_context_caveats: [],
          },
          confidence: "Low",
          would_change_if: ["yet another specific condition"],
        },
      ],
    };

    const groups = groupDecisionTraceEntriesByKind(trace);

    expect(groups!.nextSteps.map((entry) => entry.statement)).toEqual([
      "next step A",
      "next step B",
    ]);
    expect(groups!.recommendations.map((entry) => entry.statement)).toEqual([
      "recommendation A",
    ]);
  });
});

describe("formatTraceableBasisSummary", () => {
  it("returns an empty string when both groups are empty", () => {
    expect(formatTraceableBasisSummary({ recommendations: [], nextSteps: [] })).toBe("");
  });

  it("singularizes a single recommendation basis", () => {
    expect(
      formatTraceableBasisSummary({
        recommendations: [makeEntry("recommendation")],
        nextSteps: [],
      }),
    ).toBe("1 recommendation basis");
  });

  it("pluralizes multiple recommendation bases", () => {
    expect(
      formatTraceableBasisSummary({
        recommendations: [makeEntry("recommendation"), makeEntry("recommendation")],
        nextSteps: [],
      }),
    ).toBe("2 recommendation bases");
  });

  it("singularizes a single next-step basis", () => {
    expect(
      formatTraceableBasisSummary({
        recommendations: [],
        nextSteps: [makeEntry("next_step")],
      }),
    ).toBe("1 next-step basis");
  });

  it("pluralizes multiple next-step bases", () => {
    expect(
      formatTraceableBasisSummary({
        recommendations: [],
        nextSteps: [
          makeEntry("next_step"),
          makeEntry("next_step"),
          makeEntry("next_step"),
          makeEntry("next_step"),
          makeEntry("next_step"),
          makeEntry("next_step"),
        ],
      }),
    ).toBe("6 next-step bases");
  });

  it("combines both clauses with a comma when both groups are non-empty", () => {
    expect(
      formatTraceableBasisSummary({
        recommendations: [makeEntry("recommendation")],
        nextSteps: [makeEntry("next_step"), makeEntry("next_step")],
      }),
    ).toBe("1 recommendation basis, 2 next-step bases");
  });

  it("does not include any confidence distribution or tally", () => {
    const summary = formatTraceableBasisSummary({
      recommendations: [makeEntry("recommendation")],
      nextSteps: [makeEntry("next_step")],
    });

    expect(summary).not.toMatch(/confidence/i);
    expect(summary).not.toMatch(/high|medium|low/i);
  });
});
