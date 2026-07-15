import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import householdCapture from "../../../fixtures/examples/household-move-planning/expected-capture-layer.json";
import {
  evaluateDecisionBriefMarkdownOnlyAcceptance,
  formatMarkdownOnlyAcceptanceFindingLines,
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

  it("distinguishes an empty required section from a missing section", () => {
    const markdown = VALID_MARKDOWN.replace(
      /## Open Questions\s+[\s\S]*?(?=\n## Suggested Next Steps)/,
      "## Open Questions\n",
    );
    const result = evaluateDecisionBriefMarkdownOnlyAcceptance({
      result: { markdown, decisionTrace: { entries: [], created_at: new Date().toISOString() } },
      captureLayer: householdCapture,
    });
    expect(result.failureCategories).toContain("required_sections");
    expect(result.detailedFindings.emptyRequiredSections).toContain("Open Questions");
    expect(result.detailedFindings.missingRequiredSections).not.toContain("Open Questions");
  });

  it("reports multiple missing canonical sections", () => {
    const markdown = VALID_MARKDOWN
      .replace(/## Options Considered[\s\S]*?(?=\n## Recommendation)/, "")
      .replace(/## Open Questions[\s\S]*?(?=\n## Suggested Next Steps)/, "");
    const result = evaluateDecisionBriefMarkdownOnlyAcceptance({
      result: { markdown, decisionTrace: { entries: [], created_at: new Date().toISOString() } },
      captureLayer: householdCapture,
    });
    expect(result.detailedFindings.missingRequiredSections).toEqual(
      expect.arrayContaining(["Options Considered", "Open Questions"]),
    );
  });

  it("does not silently accept non-canonical heading formatting", () => {
    const markdown = VALID_MARKDOWN.replace("## Summary", "### Summary");
    const result = evaluateDecisionBriefMarkdownOnlyAcceptance({
      result: { markdown, decisionTrace: { entries: [], created_at: new Date().toISOString() } },
      captureLayer: householdCapture,
    });
    expect(result.detailedFindings.missingRequiredSections).toContain("Summary");
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

  it("detects next-step misalignment and formats bounded retry feedback", () => {
    const markdown = VALID_MARKDOWN.replace(
      /## Suggested Next Steps[\s\S]*?(?=\n## Confidence)/,
      "## Suggested Next Steps\n- Unrelated step.\n",
    );
    const result = evaluateDecisionBriefMarkdownOnlyAcceptance({
      result: { markdown, decisionTrace: { entries: [], created_at: new Date().toISOString() } },
      captureLayer: householdCapture,
    });
    expect(result.failureCategories).toContain("next_step_alignment");
    const feedback = formatMarkdownOnlyAcceptanceFindingLines(result.detailedFindings).join("\n");
    expect(feedback).toContain("exactly once in source order");
    expect(feedback).not.toContain("Uncovered next steps:");
  });
});
