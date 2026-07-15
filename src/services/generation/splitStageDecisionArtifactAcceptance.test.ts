import { describe, expect, it } from "vitest";
import type { CaptureLayer } from "../../types/captureLayer";
import { evaluateDecisionBriefSemanticAcceptance } from "./decisionBriefSemanticAcceptance";
import { buildSourceBoundDecisionTrace } from "./buildSourceBoundDecisionTrace";
import { mockModelAdapter } from "./mockModelAdapter";
import {
  DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA as WEBGPU_MARKDOWN_ONLY_SCHEMA,
  DECISION_BRIEF_RESULT_JSON_SCHEMA as WEBGPU_RESULT_SCHEMA,
} from "./webGpuGenerationSchemas";
import {
  DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA,
  DECISION_BRIEF_RESULT_JSON_SCHEMA,
} from "./decisionBriefResultSchema";
import { parseDecisionBriefResultStrict } from "./parseDecisionBriefResultStrict";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";

function buildCaptureLayer(nextStepsCount: number): CaptureLayer {
  const suggested_next_steps = Array.from(
    { length: nextStepsCount },
    (_, i) => `Confirm workstream item ${i + 1} for the hospital project rollout.`,
  );

  return {
    source_summary: "The hospital project rollout requires confirmed workstream ownership.",
    decision_context:
      "Engineering leadership must confirm every workstream before the hospital project rollout begins.",
    stated_decision: "",
    implied_decision: "Every workstream owner should confirm readiness before rollout.",
    goals: ["Deliver a confirmed hospital project rollout with clear workstream ownership."],
    stakeholders: ["Engineering leadership", "Hospital client", "Workstream owners"],
    options_considered: [
      "Confirm all workstream owners before the hospital project rollout.",
      "Delay the hospital project rollout until ownership gaps are resolved.",
    ],
    constraints: ["The hospital project rollout date is fixed."],
    risks: ["An unconfirmed workstream could delay the hospital project rollout."],
    assumptions: ["Workstream owners can confirm readiness within one week."],
    evidence: ["The hospital project rollout plan requires confirmed workstream owners."],
    open_questions: ["Which workstream items remain unconfirmed before the hospital project rollout?"],
    tensions: ["Rollout speed versus confirmed workstream readiness."],
    recommendation_candidate:
      "Confirm every workstream owner before the hospital project rollout proceeds.",
    confidence: "Medium",
    missing_context: ["Current confirmation status per workstream is not fully tracked."],
    suggested_next_steps,
  };
}

function buildMarkdown(captureLayer: CaptureLayer, options: { omitRisksSection?: boolean } = {}): string {
  const lines = [
    "# Decision Brief",
    "",
    "## Summary",
    "The hospital project rollout needs every workstream owner to confirm readiness.",
    "",
    "## Decision Context",
    captureLayer.decision_context,
    "",
    "## Options Considered",
    ...captureLayer.options_considered.map((option) => `- ${option}`),
    "",
  ];

  if (!options.omitRisksSection) {
    lines.push(
      "## Recommendation",
      captureLayer.recommendation_candidate,
      "",
      "## Risks and Constraints",
      `${captureLayer.risks[0]} ${captureLayer.constraints[0]}`,
      "",
    );
  } else {
    lines.push("## Recommendation", captureLayer.recommendation_candidate, "");
  }

  lines.push(
    "## Open Questions",
    captureLayer.open_questions[0],
    "",
    "## Suggested Next Steps",
    ...captureLayer.suggested_next_steps.map((step) => `- ${step}`),
    "",
    "## Confidence",
    "Medium confidence based on confirmed workstream ownership and the fixed rollout date.",
  );

  return lines.join("\n");
}

describe("split-stage Decision Brief full acceptance (#154)", () => {
  it("clears every deterministic gate for a Q4-style capture layer and its constructed trace", () => {
    const captureLayer = buildCaptureLayer(2);
    const markdown = buildMarkdown(captureLayer);
    const decisionTrace = buildSourceBoundDecisionTrace(captureLayer, {
      now: () => "2026-01-01T00:00:00.000Z",
    });

    const acceptance = evaluateDecisionBriefSemanticAcceptance({
      result: { markdown, decisionTrace },
      captureLayer,
    });

    expect(acceptance.accepted).toBe(true);
    expect(acceptance.failureCategories).toEqual([]);
  });

  it("clears cardinality and grounding for a synthetic 16-next-step long-form case", () => {
    const captureLayer = buildCaptureLayer(16);
    const markdown = buildMarkdown(captureLayer);
    const decisionTrace = buildSourceBoundDecisionTrace(captureLayer);

    const nextStepEntries = decisionTrace.entries.filter((entry) => entry.kind === "next_step");
    expect(nextStepEntries).toHaveLength(16);

    const acceptance = evaluateDecisionBriefSemanticAcceptance({
      result: { markdown, decisionTrace },
      captureLayer,
    });

    expect(acceptance.accepted).toBe(true);
  });

  it("clears cardinality and grounding for a synthetic 24-next-step long-form case", () => {
    const captureLayer = buildCaptureLayer(24);
    const markdown = buildMarkdown(captureLayer);
    const decisionTrace = buildSourceBoundDecisionTrace(captureLayer);

    const nextStepEntries = decisionTrace.entries.filter((entry) => entry.kind === "next_step");
    expect(nextStepEntries).toHaveLength(24);

    const acceptance = evaluateDecisionBriefSemanticAcceptance({
      result: { markdown, decisionTrace },
      captureLayer,
    });

    expect(acceptance.accepted).toBe(true);
  });

  it("does not let a valid deterministic trace mask missing Markdown sections", () => {
    const captureLayer = buildCaptureLayer(2);
    const markdown = buildMarkdown(captureLayer, { omitRisksSection: true });
    const decisionTrace = buildSourceBoundDecisionTrace(captureLayer);

    const acceptance = evaluateDecisionBriefSemanticAcceptance({
      result: { markdown, decisionTrace },
      captureLayer,
    });

    expect(acceptance.accepted).toBe(false);
    expect(acceptance.failureCategories).toContain("required_sections");
  });

  it("leaves Mock generation behavior unchanged", async () => {
    const captureLayer = buildCaptureLayer(2);
    const result = await mockModelAdapter.generateDecisionBrief({
      captureLayer,
      briefType: STRATEGY_DECISION_BRIEF,
      briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
      markdownStructure: [
        "Summary",
        "Decision Context",
        "Options Considered",
        "Recommendation",
        "Risks and Constraints",
        "Open Questions",
        "Suggested Next Steps",
      ],
      sourceLabel: undefined,
    });

    expect(result.markdown).toContain("# Decision Brief");
    expect(result.decisionTrace.entries.length).toBeGreaterThan(0);
  });

  it("leaves WebGPU schema exports unchanged (re-exported, not duplicated)", () => {
    expect(WEBGPU_MARKDOWN_ONLY_SCHEMA).toBe(DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA);
    expect(WEBGPU_RESULT_SCHEMA).toBe(DECISION_BRIEF_RESULT_JSON_SCHEMA);
  });

  it("keeps historical combined-envelope parsing valid for backward compatibility", () => {
    const combinedEnvelope = JSON.stringify({
      markdown: "# Decision Brief\n\n## Summary\nHistorical combined parsing still works.",
      decisionTrace: {
        entries: [
          {
            statement: "Historical combined parsing still works.",
            kind: "recommendation",
            basis: {
              intent: "Preserve backward compatibility.",
              supporting_evidence: ["Combined parsing predates the split architecture."],
              assumptions_relied_on: [],
              risks_addressed: [],
              risks_accepted: [],
              constraints_respected: [],
              tradeoffs: [],
              alternatives_considered: [],
              missing_context_caveats: [],
            },
            confidence: "Medium",
            would_change_if: ["If the combined parser were removed."],
          },
        ],
        created_at: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = parseDecisionBriefResultStrict(combinedEnvelope);
    expect(result.decisionTrace.entries).toHaveLength(1);
  });
});
