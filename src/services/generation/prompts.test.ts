import { afterEach, describe, expect, it } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import { DECISION_BRIEF_REQUIRED_SECTIONS } from "../../evaluation/decisionBriefWritingRules";
import { CAPTURE_LAYER_FIELDS, DECISION_BRIEF_MARKDOWN_STRUCTURE } from "./types";
import {
  buildCaptureLayerPrompt,
  buildDecisionBriefSectionScaffoldPrompt,
  buildDecisionBriefTargetedCorrectionPrompt,
  resolveCapturePromptVariant,
  type StageACorrectionPromptField,
} from "./prompts";

const baseInput = {
  rawInputText: "Decide whether to pilot specialty trades before Q4.",
  briefType: STRATEGY_DECISION_BRIEF,
  briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
  captureLayerFields: [...CAPTURE_LAYER_FIELDS],
  sourceLabel: "test",
};

describe("resolveCapturePromptVariant", () => {
  const previousVariant = process.env.VITE_CAPTURE_PROMPT_VARIANT;

  afterEach(() => {
    if (previousVariant === undefined) {
      delete process.env.VITE_CAPTURE_PROMPT_VARIANT;
    } else {
      process.env.VITE_CAPTURE_PROMPT_VARIANT = previousVariant;
    }
  });

  it("defaults to default for unset env or unknown explicit values", () => {
    delete process.env.VITE_CAPTURE_PROMPT_VARIANT;
    expect(resolveCapturePromptVariant()).toBe("default");
    expect(resolveCapturePromptVariant("")).toBe("default");
    expect(resolveCapturePromptVariant("other")).toBe("default");
  });

  it("accepts schema_skeleton explicitly or from env", () => {
    expect(resolveCapturePromptVariant("schema_skeleton")).toBe(
      "schema_skeleton",
    );
    process.env.VITE_CAPTURE_PROMPT_VARIANT = "schema_skeleton";
    expect(resolveCapturePromptVariant()).toBe("schema_skeleton");
  });
});

describe("buildDecisionBriefSectionScaffoldPrompt", () => {
  it("uses the validator's eight canonical sections as exact scaffold fields", () => {
    const briefType = STRATEGY_DECISION_BRIEF;
    const prompt = buildDecisionBriefSectionScaffoldPrompt({
      captureLayer: {
        source_summary: "Summary", decision_context: "Context", stated_decision: "", implied_decision: "Decision",
        goals: ["Goal"], stakeholders: ["Owner"], options_considered: ["Option"], constraints: ["Constraint"],
        risks: ["Risk"], assumptions: ["Assumption"], evidence: ["Evidence"], open_questions: ["Question"],
        tensions: ["Tension"], recommendation_candidate: "Choose the grounded option.", confidence: "Medium",
        missing_context: ["Missing"], suggested_next_steps: ["Do the grounded step."],
      },
      briefType,
      briefTypeGuidance: briefType.guidance,
      markdownStructure: [...DECISION_BRIEF_MARKDOWN_STRUCTURE],
    });
    for (const section of DECISION_BRIEF_REQUIRED_SECTIONS) {
      expect(prompt).toContain(`body content for ${section}`);
    }
    expect(prompt).toContain("application adds canonical Markdown headings");
  });
});

describe("buildCaptureLayerPrompt", () => {
  it("keeps default variant free of the JSON skeleton template", () => {
    const prompt = buildCaptureLayerPrompt(baseInput, { variant: "default" });
    expect(prompt).toContain("Return only valid JSON with all required fields");
    expect(prompt).not.toContain('"stated_decision": ""');
  });

  it("adds an explicit field skeleton for schema_skeleton", () => {
    const prompt = buildCaptureLayerPrompt(baseInput, {
      variant: "schema_skeleton",
    });
    expect(prompt).toContain('"stated_decision": ""');
    expect(prompt).toContain('"options_considered": []');
    expect(prompt).toContain(
      "stated_decision may be \"\" when the notes do not contain an explicit decision",
    );
    expect(prompt).toContain("Decide whether to pilot specialty trades before Q4.");
  });
});

function targetedCorrectionField(
  overrides: Partial<StageACorrectionPromptField> & Pick<StageACorrectionPromptField, "field" | "section">,
): StageACorrectionPromptField {
  return {
    body: "failing body",
    findings: [
      "Writing rule sentence-length in Options Considered: Sentence exceeds 35 words (40).",
    ],
    ...overrides,
  };
}

const LIST_GUIDANCE_MARKERS = [
  'Every item must begin with "- ".',
  "Every item must be separated by a newline.",
  "Do not combine multiple items with semicolons.",
  "Do not combine multiple items into one sentence.",
  "Each list item must contain no more than 30 whitespace-delimited words.",
  "Return the field as one JSON string containing escaped newline separators as required by JSON.",
] as const;

describe("buildDecisionBriefTargetedCorrectionPrompt", () => {
  it("requires optionsConsidered corrections as one Markdown item per line", () => {
    const prompt = buildDecisionBriefTargetedCorrectionPrompt([
      targetedCorrectionField({
        field: "optionsConsidered",
        section: "Options Considered",
      }),
    ]);

    expect(prompt).toContain(
      "rewrite this Options Considered body as a Markdown list with one concise option per line.",
    );
    for (const marker of LIST_GUIDANCE_MARKERS) {
      expect(prompt).toContain(marker);
    }
  });

  it("requires risksAndConstraints corrections as one Markdown item per line", () => {
    const prompt = buildDecisionBriefTargetedCorrectionPrompt([
      targetedCorrectionField({
        field: "risksAndConstraints",
        section: "Risks and Constraints",
        findings: [
          "Writing rule sentence-length in Risks and Constraints: Sentence exceeds 35 words (40).",
        ],
      }),
    ]);

    expect(prompt).toContain(
      "rewrite this Risks and Constraints body as a Markdown list with one concise risk or constraint per line.",
    );
    for (const marker of LIST_GUIDANCE_MARKERS) {
      expect(prompt).toContain(marker);
    }
  });

  it("requires openQuestions corrections as one Markdown item per line", () => {
    const prompt = buildDecisionBriefTargetedCorrectionPrompt([
      targetedCorrectionField({
        field: "openQuestions",
        section: "Open Questions",
        findings: [
          "Writing rule sentence-length in Open Questions: Sentence exceeds 35 words (40).",
        ],
      }),
    ]);

    expect(prompt).toContain(
      "rewrite this Open Questions body as a Markdown list with one concise question per line.",
    );
    for (const marker of LIST_GUIDANCE_MARKERS) {
      expect(prompt).toContain(marker);
    }
  });

  it("requires suggestedNextSteps corrections as one Markdown item per line", () => {
    const prompt = buildDecisionBriefTargetedCorrectionPrompt([
      targetedCorrectionField({
        field: "suggestedNextSteps",
        section: "Suggested Next Steps",
        findings: [
          "Writing rule sentence-length in Suggested Next Steps: Sentence exceeds 35 words (40).",
        ],
      }),
    ]);

    expect(prompt).toContain(
      "rewrite this Suggested Next Steps body as a Markdown list with one concise step per line.",
    );
    for (const marker of LIST_GUIDANCE_MARKERS) {
      expect(prompt).toContain(marker);
    }
  });

  it("keeps Summary guidance without list-specific instructions", () => {
    const prompt = buildDecisionBriefTargetedCorrectionPrompt([
      targetedCorrectionField({
        field: "summary",
        section: "Summary",
        findings: [
          "Writing rule summary-length in Summary: Summary exceeds 60 words (65).",
        ],
      }),
    ]);

    expect(prompt).toContain(
      "rewrite this Summary to no more than 50 whitespace-delimited words",
    );
    expect(prompt).not.toContain("Do not combine multiple items with semicolons.");
    expect(prompt).not.toContain('Every item must begin with "- ".');
  });

  it("keeps prose sentence guidance for Decision Context without list instructions", () => {
    const prompt = buildDecisionBriefTargetedCorrectionPrompt([
      targetedCorrectionField({
        field: "decisionContext",
        section: "Decision Context",
        findings: [
          "Writing rule sentence-length in Decision Context: Sentence exceeds 35 words (40).",
        ],
      }),
    ]);

    expect(prompt).toContain(
      "rewrite every prose sentence in this field to no more than 30 whitespace-delimited words",
    );
    expect(prompt).not.toContain("Do not combine multiple items with semicolons.");
    expect(prompt).not.toContain('Every item must begin with "- ".');
  });

  it("explicitly prohibits semicolon-chained list items", () => {
    const prompt = buildDecisionBriefTargetedCorrectionPrompt([
      targetedCorrectionField({
        field: "optionsConsidered",
        section: "Options Considered",
      }),
    ]);

    expect(prompt).toContain("Do not combine multiple items with semicolons.");
  });

  it("preserves exact targeted field selection and JSON contract", () => {
    const prompt = buildDecisionBriefTargetedCorrectionPrompt([
      targetedCorrectionField({
        field: "optionsConsidered",
        section: "Options Considered",
      }),
      targetedCorrectionField({
        field: "openQuestions",
        section: "Open Questions",
        findings: [
          "Writing rule sentence-length in Open Questions: Sentence exceeds 35 words (40).",
        ],
      }),
    ]);

    expect(prompt).toContain(
      "Return valid JSON with exactly these fields and no others: optionsConsidered, openQuestions.",
    );
    expect(prompt).toContain("Field: optionsConsidered");
    expect(prompt).toContain("Field: openQuestions");
  });
});
