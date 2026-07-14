import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import householdCapture from "../../../fixtures/examples/household-move-planning/expected-capture-layer.json";
import {
  evaluateDecisionBriefMarkdownOnlyAcceptance,
} from "./decisionBriefMarkdownOnlyAcceptance";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/examples/household-move-planning",
);

const VALID_MARKDOWN = readFileSync(
  join(fixtureRoot, "expected-decision-brief.md"),
  "utf8",
);

describe("evaluateDecisionBriefMarkdownOnlyAcceptance", () => {
  it("does not treat Decision Trace as applicable or passing", () => {
    const result = evaluateDecisionBriefMarkdownOnlyAcceptance({
      result: {
        markdown: VALID_MARKDOWN,
        decisionTrace: { entries: [], created_at: new Date().toISOString() },
      },
      captureLayer: householdCapture,
    });

    expect(result.decisionTraceApplicable).toBe(false);
    expect(result.failureCategories).not.toContain("decision_trace_readiness");
    expect(result.detailedFindings.traceReadinessFailures).toEqual([]);
  });

  it("detects missing Markdown sections", () => {
    const result = evaluateDecisionBriefMarkdownOnlyAcceptance({
      result: {
        markdown: "# Decision Brief\n\n## Recommendation\n\nDo the thing.",
        decisionTrace: { entries: [], created_at: new Date().toISOString() },
      },
      captureLayer: householdCapture,
    });

    expect(result.accepted).toBe(false);
    expect(result.failureCategories).toContain("required_sections");
    expect(result.detailedFindings.missingRequiredSections.length).toBeGreaterThan(0);
  });

  it("detects recommendation misalignment against Capture Layer", () => {
    const result = evaluateDecisionBriefMarkdownOnlyAcceptance({
      result: {
        markdown: VALID_MARKDOWN.replace(
          householdCapture.recommendation_candidate,
          "Completely unrelated recommendation.",
        ),
        decisionTrace: { entries: [], created_at: new Date().toISOString() },
      },
      captureLayer: householdCapture,
    });

    expect(result.accepted).toBe(false);
    expect(result.failureCategories).toContain("recommendation_alignment");
  });
});
