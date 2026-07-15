import { describe, expect, it } from "vitest";
import { parseDecisionBriefSections } from "../../evaluation/decisionBriefWritingChecks";
import { DECISION_BRIEF_REQUIRED_SECTIONS } from "../../evaluation/decisionBriefWritingRules";
import { parseDecisionBriefSectionsJson } from "./parseDecisionBriefSections";

const valid = Object.fromEntries([
  ["summary", "Summary body."], ["decisionContext", "Context body."],
  ["optionsConsidered", "- Option one"], ["recommendation", "Recommendation body."],
  ["risksAndConstraints", "Risk body."], ["openQuestions", "- Question"],
  ["suggestedNextSteps", "- Next step"], ["confidence", "Medium because evidence is incomplete."],
]);

describe("parseDecisionBriefSectionsJson", () => {
  it("assembles exact canonical headings in order", () => {
    const markdown = parseDecisionBriefSectionsJson(JSON.stringify(valid));
    expect([...parseDecisionBriefSections(markdown).keys()]).toEqual(DECISION_BRIEF_REQUIRED_SECTIONS);
  });

  it("preserves an empty body for validators instead of creating apparent content", () => {
    const markdown = parseDecisionBriefSectionsJson(JSON.stringify({ ...valid, openQuestions: "" }));
    expect(parseDecisionBriefSections(markdown).get("Open Questions")).toBe("");
  });

  it("source-binds aligned sections and bounds model-written prose without inventing content", () => {
    const long = Array.from({ length: 70 }, (_, index) => `word${index + 1}`).join(" ");
    const markdown = parseDecisionBriefSectionsJson(
      JSON.stringify({ ...valid, summary: long, recommendation: "Changed recommendation.", suggestedNextSteps: "Changed step.", risksAndConstraints: `Risk ${long} — constraint.` }),
      { captureLayer: {
        source_summary: "s", decision_context: "c", stated_decision: "", implied_decision: "d", goals: ["g"], stakeholders: ["s"],
        options_considered: ["o"], constraints: ["c"], risks: ["r"], assumptions: ["a"], evidence: ["e"], open_questions: ["q"],
        tensions: ["t"], recommendation_candidate: "Use the exact source recommendation.", confidence: "Medium", missing_context: ["m"],
        suggested_next_steps: ["First exact step.", "Second exact step."],
      } },
    );
    const sections = parseDecisionBriefSections(markdown);
    expect(sections.get("Summary")?.split(/\s+/)).toHaveLength(60);
    expect(sections.get("Recommendation")).toBe("Use the exact source recommendation.");
    expect(sections.get("Suggested Next Steps")).toBe("- First exact step.\n- Second exact step.");
    expect(markdown).not.toContain("—");
  });

  it("rejects missing and additional scaffold fields", () => {
    const { confidence: _confidence, ...missing } = valid;
    expect(() => parseDecisionBriefSectionsJson(JSON.stringify(missing))).toThrow("exactly eight");
    expect(() => parseDecisionBriefSectionsJson(JSON.stringify({ ...valid, extra: "no" }))).toThrow("exactly eight");
  });
});
