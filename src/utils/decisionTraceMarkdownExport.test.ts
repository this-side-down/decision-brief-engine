import { describe, expect, it } from "vitest";
import { EXAMPLE_FIXTURES } from "../data/exampleFixtures";
import type { DecisionTrace, DecisionTraceEntry } from "../types/decisionTrace";
import {
  appendDecisionTraceToMarkdown,
  formatDecisionTraceMarkdown,
} from "./decisionTraceMarkdownExport";

const BASE_MARKDOWN = "# Decision Brief\n\nSome reviewed content.\n";

function makeEntry(overrides: Partial<DecisionTraceEntry> = {}): DecisionTraceEntry {
  return {
    statement: "Ship the pilot to the two lowest-risk regions first.",
    kind: "recommendation",
    basis: {
      intent: "De-risk the rollout while preserving the Q4 timeline.",
      supporting_evidence: ["Pilot regions have existing support coverage."],
      assumptions_relied_on: ["Support headcount stays flat through Q4."],
      risks_addressed: ["Overloading support in high-volume regions."],
      risks_accepted: [],
      constraints_respected: ["Must launch before Q4 board review."],
      tradeoffs: [],
      alternatives_considered: ["A single-region pilot was considered and rejected as too slow."],
      missing_context_caveats: [],
    },
    confidence: "Medium",
    would_change_if: ["Support headcount drops below two FTEs per region."],
    ...overrides,
  };
}

describe("formatDecisionTraceMarkdown", () => {
  it("returns an empty string for a trace with no entries", () => {
    const trace: DecisionTrace = { entries: [], created_at: new Date().toISOString() };
    expect(formatDecisionTraceMarkdown(trace)).toBe("");
  });

  it("includes a structured heading, grouped sections, and no raw JSON", () => {
    const trace: DecisionTrace = {
      entries: [
        makeEntry({ kind: "recommendation" }),
        makeEntry({ statement: "Confirm support headcount with regional leads.", kind: "next_step" }),
      ],
      created_at: new Date().toISOString(),
    };

    const section = formatDecisionTraceMarkdown(trace);

    expect(section).toContain("## Traceable Basis");
    expect(section).toContain("### Recommendations");
    expect(section).toContain("### Next steps");
    expect(section).toContain("Ship the pilot to the two lowest-risk regions first.");
    expect(section).toContain("Confirm support headcount with regional leads.");
    expect(section).not.toContain("{");
    expect(section).not.toContain("}");
  });

  it("includes confidence and would_change_if for every entry", () => {
    const trace: DecisionTrace = {
      entries: [makeEntry({ confidence: "High" })],
      created_at: new Date().toISOString(),
    };

    const section = formatDecisionTraceMarkdown(trace);

    expect(section).toContain("Confidence: High");
    expect(section).toContain("Would change if:");
    expect(section).toContain("Support headcount drops below two FTEs per region.");
  });

  it("includes non-empty basis fields and omits empty ones", () => {
    const trace: DecisionTrace = {
      entries: [makeEntry()],
      created_at: new Date().toISOString(),
    };

    const section = formatDecisionTraceMarkdown(trace);

    expect(section).toContain("Intent served:");
    expect(section).toContain("Supporting evidence:");
    expect(section).toContain("Assumptions relied on:");
    expect(section).toContain("Risks addressed:");
    expect(section).toContain("Constraints respected:");
    expect(section).toContain("Alternatives considered:");

    // risks_accepted, tradeoffs, and missing_context_caveats are empty on this entry.
    expect(section).not.toContain("Risks accepted:");
    expect(section).not.toContain("Tradeoffs:");
    expect(section).not.toContain("Missing context caveats:");
  });

  it("omits a group heading entirely when that group has no entries", () => {
    const trace: DecisionTrace = {
      entries: [makeEntry({ kind: "recommendation" })],
      created_at: new Date().toISOString(),
    };

    const section = formatDecisionTraceMarkdown(trace);

    expect(section).toContain("### Recommendations");
    expect(section).not.toContain("### Next steps");
  });

  it("renders every gallery fixture's Decision Trace as readable Markdown", () => {
    for (const fixture of EXAMPLE_FIXTURES) {
      const section = formatDecisionTraceMarkdown(fixture.expectedDecisionTrace);

      expect(section).toContain("## Traceable Basis");
      expect(section).not.toContain("{");

      for (const entry of fixture.expectedDecisionTrace.entries) {
        expect(section).toContain(entry.statement);
        expect(section).toContain(`Confidence: ${entry.confidence}`);
      }
    }
  });
});

describe("appendDecisionTraceToMarkdown", () => {
  it("leaves Markdown unchanged when the Decision Trace is null", () => {
    expect(appendDecisionTraceToMarkdown(BASE_MARKDOWN, null)).toBe(BASE_MARKDOWN);
  });

  it("leaves Markdown unchanged when the Decision Trace has no entries", () => {
    const emptyTrace: DecisionTrace = { entries: [], created_at: new Date().toISOString() };
    expect(appendDecisionTraceToMarkdown(BASE_MARKDOWN, emptyTrace)).toBe(BASE_MARKDOWN);
  });

  it("appends a Traceable Basis section after the existing brief content", () => {
    const trace: DecisionTrace = {
      entries: [makeEntry()],
      created_at: new Date().toISOString(),
    };

    const exported = appendDecisionTraceToMarkdown(BASE_MARKDOWN, trace);

    expect(exported.startsWith(BASE_MARKDOWN.trimEnd())).toBe(true);
    expect(exported).toContain("## Traceable Basis");
    expect(exported).toContain("Ship the pilot to the two lowest-risk regions first.");
  });

  it("does not dump raw Decision Trace JSON into the export", () => {
    const trace: DecisionTrace = {
      entries: [makeEntry()],
      created_at: new Date().toISOString(),
    };

    const exported = appendDecisionTraceToMarkdown(BASE_MARKDOWN, trace);

    expect(exported).not.toContain(JSON.stringify(trace));
    expect(exported).not.toMatch(/"statement":/);
  });
});
