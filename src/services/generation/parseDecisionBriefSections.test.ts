import { describe, expect, it } from "vitest";
import {
  evaluateDecisionBriefWriting,
  parseDecisionBriefSections,
} from "../../evaluation/decisionBriefWritingChecks";
import { DECISION_BRIEF_REQUIRED_SECTIONS } from "../../evaluation/decisionBriefWritingRules";
import { evaluateBriefMarkdownAlignment } from "../../evaluation/pipeline/alignmentChecks";
import type { CaptureLayer } from "../../types/captureLayer";
import { parseDecisionBriefSectionsJson } from "./parseDecisionBriefSections";

const valid = Object.fromEntries([
  ["summary", "Summary body."], ["decisionContext", "Context body."],
  ["optionsConsidered", "- Option one"], ["recommendation", "Recommendation body."],
  ["risksAndConstraints", "Risk body."], ["openQuestions", "- Question"],
  ["suggestedNextSteps", "- Next step"], ["confidence", "Medium because evidence is incomplete."],
]);

const captureLayer: CaptureLayer = {
  source_summary: "s", decision_context: "c", stated_decision: "", implied_decision: "d", goals: ["g"], stakeholders: ["s"],
  options_considered: ["o"], constraints: ["c"], risks: ["r"], assumptions: ["a"], evidence: ["e"], open_questions: ["q"],
  tensions: ["t"], recommendation_candidate: "Use the exact source recommendation.", confidence: "Medium", missing_context: ["m"],
  suggested_next_steps: ["First exact step.", "Second exact step."],
};

describe("parseDecisionBriefSectionsJson", () => {
  it("assembles exact canonical headings in order", () => {
    const markdown = parseDecisionBriefSectionsJson(JSON.stringify(valid));
    expect([...parseDecisionBriefSections(markdown).keys()]).toEqual(DECISION_BRIEF_REQUIRED_SECTIONS);
  });

  it("preserves an empty body for validators instead of creating apparent content", () => {
    const markdown = parseDecisionBriefSectionsJson(JSON.stringify({ ...valid, openQuestions: "" }));
    expect(parseDecisionBriefSections(markdown).get("Open Questions")).toBe("");
  });

  it("source-binds aligned sections and normalizes em-dash punctuation without deleting content", () => {
    const markdown = parseDecisionBriefSectionsJson(
      JSON.stringify({ ...valid, recommendation: "Changed recommendation.", suggestedNextSteps: "Changed step.", risksAndConstraints: "Risk — qualification." }),
      { captureLayer },
    );
    const sections = parseDecisionBriefSections(markdown);
    expect(sections.get("Recommendation")).toBe("Use the exact source recommendation.");
    expect(sections.get("Suggested Next Steps")).toBe("- First exact step.\n- Second exact step.");
    expect(markdown).not.toContain("—");
    expect(sections.get("Risks and Constraints")).toContain("qualification.");
  });

  it("turns the 41-word Q4 recommendation into aligned sentences that pass writing validation", () => {
    const q4Capture = {
      ...captureLayer,
      recommendation_candidate: "Prioritize hospital project with Marcus as senior superintendent if multifamily closeout can be managed with PM-led coverage and school project backfilled with Carlos (promoted with training support), while ensuring hospital start date is confirmed and candidate availability is addressed by Friday.",
    };
    const markdown = parseDecisionBriefSectionsJson(JSON.stringify(valid), { captureLayer: q4Capture });
    expect(parseDecisionBriefSections(markdown).get("Recommendation")).toContain("support). While ensuring");
    expect(evaluateBriefMarkdownAlignment({ captureLayer: q4Capture, briefMarkdown: markdown }).recommendationAlignmentPass).toBe(true);
    expect(evaluateDecisionBriefWriting(markdown).errors).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: "sentence-length", section: "Recommendation" })]),
    );
  });

  it("keeps an arbitrary newline from hiding a punctuation-free 70-word sentence", () => {
    const longSentence = Array.from({ length: 70 }, (_, index) => `word${index + 1}`).join(" ");
    const arbitraryWrapped = longSentence.replace("word35 ", "word35\n");
    const markdown = parseDecisionBriefSectionsJson(
      JSON.stringify({ ...valid, risksAndConstraints: arbitraryWrapped }),
    );
    expect(parseDecisionBriefSections(markdown).get("Risks and Constraints")).toBe(longSentence);
    expect(evaluateDecisionBriefWriting(markdown).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: "sentence-length", section: "Risks and Constraints" })]),
    );
  });

  it("preserves important Summary content after word 60 and reports summary-length", () => {
    const firstSixty = Array.from({ length: 60 }, (_, index) => `word${index + 1}`).join(" ");
    const summary = `${firstSixty} CRITICAL_QUALIFICATION remains required after the threshold.`;
    const markdown = parseDecisionBriefSectionsJson(JSON.stringify({ ...valid, summary }));
    expect(parseDecisionBriefSections(markdown).get("Summary")).toContain("CRITICAL_QUALIFICATION");
    expect(evaluateDecisionBriefWriting(markdown).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: "summary-length", section: "Summary" })]),
    );
  });

  it("rejects missing and additional scaffold fields", () => {
    const { confidence: _confidence, ...missing } = valid;
    expect(() => parseDecisionBriefSectionsJson(JSON.stringify(missing))).toThrow("exactly eight");
    expect(() => parseDecisionBriefSectionsJson(JSON.stringify({ ...valid, extra: "no" }))).toThrow("exactly eight");
  });
});
