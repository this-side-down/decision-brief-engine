import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import q4CaptureLayer from "../../../fixtures/examples/q4-workforce-allocation/expected-capture-layer.json";
import q4DecisionTrace from "../../../fixtures/examples/q4-workforce-allocation/expected-decision-trace.json";
import { createW3PlaceholderLeakedBriefResult } from "./fixtures/w3PlaceholderLeakedBriefResult";
import { evaluateDecisionBriefSemanticAcceptance } from "./decisionBriefSemanticAcceptance";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/examples/q4-workforce-allocation",
);

const Q4_BRIEF_MARKDOWN = readFileSync(
  join(fixtureRoot, "expected-decision-brief.md"),
  "utf-8",
);

const groundedResult = {
  markdown: Q4_BRIEF_MARKDOWN,
  decisionTrace: q4DecisionTrace,
};

describe("evaluateDecisionBriefSemanticAcceptance", () => {
  it("passes a clean grounded result", () => {
    const result = evaluateDecisionBriefSemanticAcceptance({
      result: groundedResult,
      captureLayer: q4CaptureLayer,
    });

    expect(result.accepted).toBe(true);
    expect(result.failureCategories).toEqual([]);
  });

  it("fails schema-valid placeholder output", () => {
    const result = evaluateDecisionBriefSemanticAcceptance({
      result: createW3PlaceholderLeakedBriefResult(),
      captureLayer: q4CaptureLayer,
    });

    expect(result.accepted).toBe(false);
    expect(result.failureCategories).toContain("placeholder_leakage");
  });

  it("fails when required sections are missing", () => {
    const result = evaluateDecisionBriefSemanticAcceptance({
      result: {
        markdown: "# Decision Brief\n\n## Recommendation\n\nDo the thing.",
        decisionTrace: q4DecisionTrace,
      },
      captureLayer: q4CaptureLayer,
    });

    expect(result.accepted).toBe(false);
    expect(result.failureCategories).toContain("required_sections");
  });

  it("fails hollow Decision Trace readiness", () => {
    const result = evaluateDecisionBriefSemanticAcceptance({
      result: {
        markdown: Q4_BRIEF_MARKDOWN,
        decisionTrace: {
          entries: [
            {
              statement: "Placeholder recommendation",
              kind: "recommendation",
              basis: {
                intent: "",
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
              would_change_if: ["if the situation changes"],
            },
          ],
          created_at: "1970-01-01T00:00:00.000Z",
        },
      },
      captureLayer: q4CaptureLayer,
    });

    expect(result.accepted).toBe(false);
    expect(result.failureCategories).toContain("decision_trace_readiness");
  });

  it("fails recommendation misalignment", () => {
    const misalignedTrace = structuredClone(q4DecisionTrace);
    misalignedTrace.entries[0].statement =
      "Completely unrelated recommendation text that matches nothing.";

    const result = evaluateDecisionBriefSemanticAcceptance({
      result: {
        markdown: Q4_BRIEF_MARKDOWN,
        decisionTrace: misalignedTrace,
      },
      captureLayer: q4CaptureLayer,
    });

    expect(result.accepted).toBe(false);
    expect(result.failureCategories).toContain("recommendation_alignment");
  });

  it("fails next-step misalignment", () => {
    const misalignedTrace = structuredClone(q4DecisionTrace);
    misalignedTrace.entries = misalignedTrace.entries.filter(
      (entry) => entry.kind === "recommendation",
    );

    const result = evaluateDecisionBriefSemanticAcceptance({
      result: {
        markdown: Q4_BRIEF_MARKDOWN,
        decisionTrace: misalignedTrace,
      },
      captureLayer: q4CaptureLayer,
    });

    expect(result.accepted).toBe(false);
    expect(result.failureCategories).toContain("next_step_alignment");
  });

  it("fails writing hard failures", () => {
    const markdown = Q4_BRIEF_MARKDOWN.replace(
      "## Summary",
      "## Summary\n\nMoving forward, assign Marcus immediately.",
    );

    const result = evaluateDecisionBriefSemanticAcceptance({
      result: {
        markdown,
        decisionTrace: q4DecisionTrace,
      },
      captureLayer: q4CaptureLayer,
    });

    expect(result.accepted).toBe(false);
    expect(result.failureCategories).toContain("writing_hard_failure");
  });

  it("does not fail on warnings alone", () => {
    const markdown = Q4_BRIEF_MARKDOWN.replace(
      "Portfolio workforce allocation under Q4 schedule pressure.",
      "Portfolio workforce allocation under Q4 hospital/school/multifamily/warehouse/client pressure.",
    );

    const result = evaluateDecisionBriefSemanticAcceptance({
      result: {
        markdown,
        decisionTrace: q4DecisionTrace,
      },
      captureLayer: q4CaptureLayer,
    });

    expect(result.accepted).toBe(true);
    expect(result.failureCategories).toEqual([]);
  });
});
