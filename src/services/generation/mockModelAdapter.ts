import type { CaptureLayer } from "../../types/captureLayer";
import type {
  GenerateCaptureLayerInput,
  GenerateDecisionBriefInput,
  ModelAdapter,
} from "./types";

function summarizeSource(rawInputText: string) {
  const normalizedInput = rawInputText.trim().replace(/\s+/g, " ");

  if (normalizedInput.length <= 180) {
    return normalizedInput;
  }

  return `${normalizedInput.slice(0, 177)}...`;
}

function buildMockCaptureLayer(
  input: GenerateCaptureLayerInput,
): CaptureLayer {
  const sourceSummary = summarizeSource(input.rawInputText);
  const briefTypeName = input.briefType.name;
  const normalizedInput = input.rawInputText.toLowerCase();

  if (
    input.briefType.id === "product" &&
    normalizedInput.includes("team workspace") &&
    normalizedInput.includes("august")
  ) {
    return {
      source_summary:
        "Product planning notes about whether to ship team workspace visibility in August as a narrow beta or hold it for the Q4 account-management release.",
      decision_context:
        "Sales wants earlier workspace visibility for two expansion deals, CS is concerned about admin confusion, and Engineering says the feature is mostly done but permissions inheritance remains brittle.",
      stated_decision: "",
      implied_decision:
        "Decide whether to ship team workspace visibility before the Q4 account-management release, and if so, how narrowly to scope it.",
      goals: [
        "Support expansion deals this quarter",
        "Avoid creating another confusing admin concept",
        "Avoid rework when account management ships",
        "Give CS a clearer story for existing customers",
      ],
      stakeholders: ["Sales", "Customer Success", "Engineering", "Admins", "Expansion customers"],
      options_considered: [
        "Ship workspace visibility in August with limited permissions and clear beta labeling",
        "Hold all workspace work until Q4 and launch it with account management",
        "Ship only internal workspace admin tools now and keep customer-facing visibility hidden",
      ],
      constraints: [
        "Permissions inheritance is still brittle",
        "Another engineering sprint is likely needed",
        "Account management is planned for Q4",
        "Two expansion opportunities are asking for shared workspace visibility",
      ],
      risks: [
        "Early release could increase support volume",
        "Waiting until Q4 may hurt expansion opportunities",
        "Permissions bugs would damage trust",
        "Beta labeling might make the product feel unfinished",
      ],
      assumptions: [
        "Named design partners can tolerate clearly labeled beta limitations",
        "Limited workspace visibility can support the expansion conversations",
        "Permissions limitations can be explained clearly enough for beta users",
      ],
      evidence: [
        "Sales reports two expansion deals asking for shared workspace visibility",
        "CS reports current admin confusion across projects, workspaces, and accounts",
        "Engineering reports workspace feature work is mostly done but permissions inheritance is brittle",
      ],
      open_questions: [
        "Which customers actually need workspace visibility before Q4?",
        "Can Sales commit the August release as beta only?",
        "How much permissions work remains?",
        "Would limited admin-only visibility satisfy the expansion deals?",
      ],
      tensions: [
        "Near-term expansion revenue versus risk of admin confusion",
        "Shipping momentum versus permissions quality",
        "Narrow beta scope versus customer perception of unfinished product",
      ],
      recommendation_candidate:
        "Ship a narrow August beta for named design partners only, with explicit permissions limitations and clear beta framing.",
      confidence: "Medium",
      missing_context: [
        "List of customers that need workspace visibility before Q4",
        "Engineering estimate for remaining permissions work",
        "Sales commitment on beta positioning",
        "Definition of acceptable support load for beta",
      ],
      suggested_next_steps: [
        "Confirm named design partner list with Sales",
        "Ask Engineering to size remaining permissions inheritance work",
        "Align CS and Sales on beta messaging",
        "Define the minimum August beta scope and explicit non-goals",
      ],
    };
  }

  return {
    source_summary: sourceSummary,
    decision_context: `Mock capture for a ${briefTypeName}. The pasted notes appear to contain decision context that should be structured before drafting a brief.`,
    stated_decision: "",
    implied_decision: `Clarify the primary ${input.briefType.id} decision before producing the final Decision Brief.`,
    goals: input.briefType.guidance.outputEmphasis.slice(0, 2),
    stakeholders: ["Decision owner", "Affected team", "Reviewer"],
    options_considered: input.briefType.guidance.exampleDecisionQuestions
      .slice(0, 2)
      .map((question) => `Option implied by: ${question}`),
    constraints: ["Source material may be incomplete", "MVP uses mocked generation"],
    risks: [
      "The source notes may omit important context",
      "The final recommendation should not exceed the captured evidence",
    ],
    assumptions: [
      "The pasted notes are relevant to the selected brief type",
      "The user will review the Capture Layer before relying on the final brief",
    ],
    evidence: [sourceSummary],
    open_questions: [
      "What decision needs to be made now?",
      "Which facts are confirmed versus inferred?",
    ],
    tensions: [
      "Speed of decision-making versus confidence in available context",
    ],
    recommendation_candidate: "",
    confidence: "Medium",
    missing_context: [
      "Explicit decision owner",
      "Confirmed success criteria",
      "Evidence strong enough to support a recommendation",
    ],
    suggested_next_steps: [
      "Review the mocked Capture Layer for missing context",
      "Confirm the selected brief type before generating a Decision Brief",
    ],
  };
}

function formatList(items: string[]) {
  if (items.length === 0) {
    return "- Not captured yet.";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function buildMockDecisionBrief(input: GenerateDecisionBriefInput) {
  const { captureLayer } = input;
  const recommendation =
    captureLayer.recommendation_candidate ||
    "No final recommendation is supportable yet. Use the next steps to close missing context before deciding.";

  return [
    "# Decision Brief",
    "",
    "## Summary",
    captureLayer.source_summary || "No source summary captured yet.",
    "",
    "## Decision Context",
    captureLayer.decision_context || "Decision context is not captured yet.",
    "",
    "## Options Considered",
    formatList(captureLayer.options_considered),
    "",
    "## Recommendation",
    recommendation,
    "",
    "## Risks and Constraints",
    "### Risks",
    formatList(captureLayer.risks),
    "",
    "### Constraints",
    formatList(captureLayer.constraints),
    "",
    "## Open Questions",
    formatList(captureLayer.open_questions),
    "",
    "## Suggested Next Steps",
    formatList(captureLayer.suggested_next_steps),
    "",
    "## Confidence",
    `Confidence: ${captureLayer.confidence}`,
  ].join("\n");
}

export const mockModelAdapter: ModelAdapter = {
  async generateCaptureLayer(input) {
    if (!input.rawInputText.trim()) {
      throw new Error("Raw input is required to generate a Capture Layer.");
    }

    return buildMockCaptureLayer(input);
  },
  async generateDecisionBrief(input: GenerateDecisionBriefInput) {
    const markdown = buildMockDecisionBrief(input);

    if (!markdown.trim()) {
      throw new Error("Mock Decision Brief generation returned empty Markdown.");
    }

    return markdown;
  },
};
