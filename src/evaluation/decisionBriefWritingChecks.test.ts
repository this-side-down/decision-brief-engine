import { describe, expect, it } from "vitest";
import { EXAMPLE_FIXTURES } from "../data/exampleFixtures";
import {
  evaluateDecisionBriefWriting,
  parseDecisionBriefSections,
  splitProseSentences,
} from "./decisionBriefWritingChecks";
import {
  BANNED_CANNED_PHRASES,
  BANNED_CONSULTANT_FILLER,
} from "./decisionBriefWritingRules";

const BASE_MARKDOWN = `# Decision Brief

## Summary

Assign Marcus to the hospital project after multifamily handoff. Decide before Thursday.

## Decision Context

Hospital and school projects need superintendent coverage under Q4 pressure.

## Options Considered

- Reassign Marcus to the hospital project
- Promote Carlos on the school project

## Recommendation

Assign Marcus to the hospital project with a defined handoff plan.

## Risks and Constraints

### Risks

- Client escalation on hospital projects

### Constraints

- Decision is needed before Thursday client call

## Open Questions

- What is the confirmed hospital start date?

## Suggested Next Steps

- Finalize a Q4 staffing matrix before the monthly staffing review

## Confidence

Confidence: Medium. Hospital start date remains unconfirmed.
`;

describe("evaluateDecisionBriefWriting hard failures", () => {
  it("passes a concise decision-first brief", () => {
    const result = evaluateDecisionBriefWriting(BASE_MARKDOWN);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails on em dash", () => {
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace("Thursday.", "Thursday\u2014soon."),
    );
    expect(result.errors.some((finding) => finding.ruleId === "em-dash")).toBe(true);
  });

  it("fails on emoji", () => {
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace("Thursday.", "Thursday soon 🙂."),
    );
    expect(result.errors.some((finding) => finding.ruleId === "emoji")).toBe(true);
  });

  it("fails on exclamation marks", () => {
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace("Thursday.", "Thursday soon!"),
    );
    expect(result.errors.some((finding) => finding.ruleId === "exclamation")).toBe(true);
  });

  it.each([...BANNED_CANNED_PHRASES, ...BANNED_CONSULTANT_FILLER])(
    "fails on banned phrase: %s",
    (phrase) => {
      const result = evaluateDecisionBriefWriting(
        `${BASE_MARKDOWN}\n\n${phrase}.`,
      );
      expect(result.errors.some((finding) => finding.ruleId === "banned-phrase")).toBe(
        true,
      );
    },
  );

  it("fails when Summary exceeds 60 words", () => {
    const longSummary = Array.from({ length: 65 }, (_, index) => `word${index}`).join(
      " ",
    );
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace(
        "Assign Marcus to the hospital project after multifamily handoff. Decide before Thursday.",
        longSummary,
      ),
    );
    expect(result.errors.some((finding) => finding.ruleId === "summary-length")).toBe(
      true,
    );
  });

  it("fails when a prose sentence exceeds 35 words", () => {
    const longSentence = Array.from({ length: 40 }, (_, index) => `word${index}`).join(
      " ",
    );
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace(
        "Hospital and school projects need superintendent coverage under Q4 pressure.",
        `${longSentence}.`,
      ),
    );
    expect(result.errors.some((finding) => finding.ruleId === "sentence-length")).toBe(
      true,
    );
  });

  it("fails when a required section is missing", () => {
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace("## Confidence\n\nConfidence: Medium. Hospital start date remains unconfirmed.", ""),
    );
    expect(result.errors.some((finding) => finding.ruleId === "missing-section")).toBe(
      true,
    );
  });

  it("fails when a required section is empty", () => {
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace(
        "## Open Questions\n\n- What is the confirmed hospital start date?",
        "## Open Questions\n\n",
      ),
    );
    expect(result.errors.some((finding) => finding.ruleId === "empty-section")).toBe(
      true,
    );
  });

  it("fails on bare confidence labels", () => {
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace(
        "Confidence: Medium. Hospital start date remains unconfirmed.",
        "Confidence: Medium",
      ),
    );
    expect(result.errors.some((finding) => finding.ruleId === "bare-confidence")).toBe(
      true,
    );
  });
});

describe("evaluateDecisionBriefWriting warnings and reports", () => {
  it("records sentence-length warnings without failing", () => {
    const warningSentence = Array.from({ length: 30 }, (_, index) => `word${index}`).join(
      " ",
    );
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace(
        "Hospital and school projects need superintendent coverage under Q4 pressure.",
        `${warningSentence}.`,
      ),
    );
    expect(result.passed).toBe(true);
    expect(result.warnings.some((finding) => finding.ruleId === "sentence-length-warning")).toBe(
      true,
    );
  });

  it("records slash-pair warnings without failing", () => {
    const result = evaluateDecisionBriefWriting(
      BASE_MARKDOWN.replace(
        "Hospital and school projects need superintendent coverage under Q4 pressure.",
        "Hospital and school projects need superintendent coverage across hospital/school/multifamily/warehouse/client paths.",
      ),
    );
    expect(result.passed).toBe(true);
    expect(result.warnings.some((finding) => finding.ruleId === "slash-pairs")).toBe(
      true,
    );
  });

  it("records report-only findings without failing", () => {
    const result = evaluateDecisionBriefWriting(BASE_MARKDOWN, {
      captureLayer: {
        source_summary: "Notes about Marcus and Carlos at the hospital project.",
        decision_context: "Q4 staffing for hospital and school projects.",
        stated_decision: "Allocate Marcus",
        implied_decision: "",
        goals: ["Staff hospital project"],
        stakeholders: ["VP Operations", "HR", "Safety", "Controls"],
        options_considered: ["Assign Marcus", "Promote Carlos", "Hire contractor"],
        constraints: ["Thursday client call"],
        risks: ["Client escalation", "Training gaps", "Schedule penalties"],
        assumptions: ["Marcus can transition", "Carlos can promote"],
        evidence: ["Hospital client asked for named superintendent"],
        open_questions: ["Hospital start date?"],
        tensions: ["Hospital urgency versus school penalties"],
        recommendation_candidate: "Assign Marcus",
        confidence: "Medium",
        missing_context: ["Hospital start date"],
        suggested_next_steps: ["Finalize staffing matrix"],
      },
      sourceText: "Hospital project needs Marcus.",
    });

    expect(result.passed).toBe(true);
    expect(result.reports.length).toBeGreaterThan(0);
  });
});

describe("Markdown-aware prose handling", () => {
  it("parses required sections from Markdown headings", () => {
    const sections = parseDecisionBriefSections(BASE_MARKDOWN);
    expect(sections.get("Summary")).toContain("Assign Marcus");
    expect(sections.get("Confidence")).toContain("Medium");
  });

  it("ignores fenced code blocks when counting sentence length", () => {
    const fenced = `${BASE_MARKDOWN}

\`\`\`json
${"x".repeat(400)}
\`\`\`
`;
    const result = evaluateDecisionBriefWriting(fenced);
    expect(result.errors.some((finding) => finding.ruleId === "sentence-length")).toBe(
      false,
    );
  });

  it("does not split sentences inside URLs", () => {
    const sentences = splitProseSentences(
      "See https://example.com/path/to/resource for details. Next sentence here.",
    );
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toContain("__URL__");
  });

  it("ignores list markers when splitting sentences", () => {
    const sentences = splitProseSentences(
      "- Assign Marcus to the hospital project.\n- Promote Carlos on the school project.",
    );
    expect(sentences).toHaveLength(2);
  });
});

describe("canonical fixtures", () => {
  it.each(EXAMPLE_FIXTURES.map((fixture) => [fixture.metadata.id, fixture]))(
    "passes hard-fail writing checks for %s",
    (_id, fixture) => {
      const result = evaluateDecisionBriefWriting(fixture.expectedDecisionBrief, {
        captureLayer: fixture.expectedCaptureLayer,
        sourceText: fixture.rawNotes,
      });

      expect(
        result.errors,
        JSON.stringify(result.errors, null, 2),
      ).toHaveLength(0);
      expect(result.passed).toBe(true);
    },
  );
});
