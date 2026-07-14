import type { CaptureLayer } from "../../types/captureLayer";
import type {
  DecisionTrace,
  DecisionTraceEntry,
} from "../../types/decisionTrace";
import { parseDemoExampleId } from "../../data/demoExamples";
import {
  MOCK_CAPTURE_LAYERS_BY_EXAMPLE_ID,
  MOCK_DECISION_BRIEFS_BY_EXAMPLE_ID,
  MOCK_DECISION_TRACES_BY_EXAMPLE_ID,
} from "../../data/exampleFixtures";
import { buildGenericMockCaptureLayer } from "./genericMockCapture";
import type {
  DecisionBriefResult,
  GenerateCaptureLayerInput,
  GenerateDecisionBriefInput,
  GenerateDecisionBriefOptions,
  ModelAdapter,
} from "./types";

function buildConstructionKeywordCaptureLayer(): CaptureLayer {
  return MOCK_CAPTURE_LAYERS_BY_EXAMPLE_ID["q4-workforce-allocation"];
}

function buildMockCaptureLayer(
  input: GenerateCaptureLayerInput,
): CaptureLayer {
  const normalizedInput = input.rawInputText.toLowerCase();

  const demoExampleId = parseDemoExampleId(input.sourceLabel);
  if (demoExampleId) {
    return MOCK_CAPTURE_LAYERS_BY_EXAMPLE_ID[demoExampleId];
  }

  if (
    input.briefType.id === "strategy" &&
    normalizedInput.includes("workforce allocation") &&
    normalizedInput.includes("hospital project")
  ) {
    return buildConstructionKeywordCaptureLayer();
  }

  return buildGenericMockCaptureLayer(input);
}

/**
 * Fallback Decision Trace generator used only for non-demo mock input (arbitrary
 * pasted notes without a matching gallery fixture). The three public gallery
 * examples use explicit, hand-authored fixtures in fixtures/examples/*\/expected-decision-trace.json
 * instead of this generated shape, so expected rationale stays readable and
 * verifiable rather than opaque generated output.
 */
function buildMockDecisionTrace(captureLayer: CaptureLayer): DecisionTrace {
  const now = new Date().toISOString();
  const entries: DecisionTraceEntry[] = [];

  const openQuestionsForWouldChange = captureLayer.open_questions.slice(0, 2);

  function wouldChangeIfFromOpenQuestions(fallback: string): string[] {
    if (openQuestionsForWouldChange.length > 0) {
      return openQuestionsForWouldChange.map(
        (question) => `The answer to "${question}" would change this basis.`,
      );
    }
    return [fallback];
  }

  if (captureLayer.recommendation_candidate) {
    entries.push({
      statement: captureLayer.recommendation_candidate,
      kind: "recommendation",
      basis: {
        intent: captureLayer.goals[0] ?? "",
        supporting_evidence: captureLayer.evidence.slice(0, 3),
        assumptions_relied_on: captureLayer.assumptions,
        risks_addressed: captureLayer.risks.slice(0, 2),
        risks_accepted: captureLayer.risks.slice(2),
        constraints_respected: captureLayer.constraints,
        tradeoffs: captureLayer.tensions,
        alternatives_considered: captureLayer.options_considered.slice(0, 3),
        missing_context_caveats: captureLayer.missing_context,
      },
      confidence: captureLayer.confidence,
      would_change_if: wouldChangeIfFromOpenQuestions(
        "Supporting evidence or assumptions changing materially would change this basis.",
      ),
    });
  }

  for (const step of captureLayer.suggested_next_steps) {
    const wouldChangeIf = captureLayer.missing_context
      .slice(0, 1)
      .map(
        (missingContext) =>
          `Confirmation of "${missingContext}" would change this basis.`,
      );

    entries.push({
      statement: step,
      kind: "next_step",
      basis: {
        intent: captureLayer.goals[0] ?? "",
        supporting_evidence: captureLayer.evidence.slice(0, 1),
        assumptions_relied_on: captureLayer.assumptions.slice(0, 1),
        risks_addressed: [],
        risks_accepted: [],
        constraints_respected: captureLayer.constraints.slice(0, 1),
        tradeoffs: [],
        alternatives_considered: [],
        missing_context_caveats: captureLayer.missing_context.slice(0, 1),
      },
      confidence: "Low",
      would_change_if:
        wouldChangeIf.length > 0
          ? wouldChangeIf
          : ["Missing context confirmation would change this basis."],
    });
  }

  return { entries, created_at: now };
}

function formatList(items: string[]) {
  if (items.length === 0) {
    return "- Not captured yet.";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function buildTemplateDecisionBrief(input: GenerateDecisionBriefInput) {
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

function buildMockDecisionBrief(input: GenerateDecisionBriefInput) {
  const demoExampleId = parseDemoExampleId(input.sourceLabel);
  if (demoExampleId) {
    return MOCK_DECISION_BRIEFS_BY_EXAMPLE_ID[demoExampleId];
  }

  return buildTemplateDecisionBrief(input);
}

export const mockModelAdapter: ModelAdapter = {
  async generateCaptureLayer(input) {
    if (!input.rawInputText.trim()) {
      throw new Error("Raw input is required to generate a Capture Layer.");
    }

    return buildMockCaptureLayer(input);
  },

  async generateDecisionBrief(
    input: GenerateDecisionBriefInput,
    _options?: GenerateDecisionBriefOptions,
  ): Promise<DecisionBriefResult> {
    const markdown = buildMockDecisionBrief(input);

    if (!markdown.trim()) {
      throw new Error("Mock Decision Brief generation returned empty Markdown.");
    }

    const demoExampleId = parseDemoExampleId(input.sourceLabel);
    const decisionTrace = demoExampleId
      ? MOCK_DECISION_TRACES_BY_EXAMPLE_ID[demoExampleId]
      : buildMockDecisionTrace(input.captureLayer);

    return { markdown, decisionTrace };
  },
};
