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

export const mockModelAdapter: ModelAdapter = {
  async generateCaptureLayer(input) {
    if (!input.rawInputText.trim()) {
      throw new Error("Raw input is required to generate a Capture Layer.");
    }

    return buildMockCaptureLayer(input);
  },
  async generateDecisionBrief(_input: GenerateDecisionBriefInput) {
    throw new Error("Decision Brief generation is not implemented yet.");
  },
};
