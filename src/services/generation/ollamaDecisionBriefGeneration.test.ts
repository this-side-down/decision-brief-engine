import { beforeEach, describe, expect, it, vi } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import type { CaptureLayer } from "../../types/captureLayer";
import { ollamaGenerate } from "./ollamaClient";
import { DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA } from "./decisionBriefResultSchema";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";
import type { DecisionArtifactDiagnosticsHolder } from "./decisionArtifactDiagnostics";
import { DECISION_BRIEF_MARKDOWN_STRUCTURE } from "./types";
import { GenerationCancelledError } from "./webGpuErrors";
import { generateOllamaDecisionBrief } from "./ollamaDecisionBriefGeneration";

vi.mock("./ollamaClient", () => ({
  ollamaGenerate: vi.fn(),
}));

const mockOllamaGenerate = vi.mocked(ollamaGenerate);

const captureLayer: CaptureLayer = {
  source_summary: "Q4 hospital project requires senior engineering staffing.",
  decision_context: "Engineering leadership must allocate senior engineers before the Q4 deadline.",
  stated_decision: "",
  implied_decision: "Senior engineers should move onto the hospital project.",
  goals: ["Deliver the hospital project on the fixed Q4 deadline."],
  stakeholders: ["Engineering leadership", "Hospital client"],
  options_considered: [
    "Reassign senior engineers from the platform team to the hospital project.",
    "Hire contractors for the hospital project instead.",
  ],
  constraints: ["The Q4 hospital deadline is fixed and cannot move."],
  risks: ["The platform team may fall behind without senior engineers."],
  assumptions: ["Contractors would need several weeks to ramp up."],
  evidence: ["The hospital contract specifies a fixed Q4 delivery date."],
  open_questions: ["Will the platform roadmap slip if senior engineers move?"],
  tensions: ["Hospital delivery speed versus platform team continuity."],
  recommendation_candidate: "Reassign senior engineers to the hospital project through Q4.",
  confidence: "Medium",
  missing_context: ["Current contractor ramp-up time is not confirmed."],
  suggested_next_steps: [
    "Confirm contractor availability for the platform team.",
    "Notify the hospital client of the staffing plan.",
  ],
};

const baseInput = {
  captureLayer,
  briefType: STRATEGY_DECISION_BRIEF,
  briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
  markdownStructure: [...DECISION_BRIEF_MARKDOWN_STRUCTURE],
  toneGuidance: "Concise",
  sourceLabel: "demo:q4-workforce-allocation",
};

function buildValidMarkdown(overrides: {
  recommendation?: string;
  nextSteps?: string[];
  omitRisksSection?: boolean;
  riskSentence?: string;
} = {}): string {
  const recommendation = overrides.recommendation ?? captureLayer.recommendation_candidate;
  const nextSteps = overrides.nextSteps ?? captureLayer.suggested_next_steps;
  const riskSentence =
    overrides.riskSentence ??
    "The platform team may fall behind without senior engineers, and the Q4 deadline is fixed.";

  const lines = [
    "# Decision Brief",
    "",
    "## Summary",
    "Engineering must staff the hospital project before the fixed Q4 deadline.",
    "",
    "## Decision Context",
    "Senior engineers are needed on the hospital project to hit the Q4 delivery date.",
    "",
    "## Options Considered",
    "- Reassign senior engineers from the platform team to the hospital project.",
    "- Hire contractors for the hospital project instead.",
    "",
  ];

  if (!overrides.omitRisksSection) {
    lines.push(
      "## Recommendation",
      recommendation,
      "",
      "## Risks and Constraints",
      riskSentence,
      "",
    );
  } else {
    lines.push("## Recommendation", recommendation, "");
  }

  lines.push(
    "## Open Questions",
    "Will the platform roadmap slip if senior engineers move to the hospital project?",
    "",
    "## Suggested Next Steps",
    nextSteps.map((step) => `- ${step}`).join("\n"),
    "",
    "## Confidence",
    "Medium confidence based on the fixed hospital deadline and available contractor lead time.",
  );

  return lines.join("\n");
}

function markdownOnlyEnvelope(markdown: string): string {
  return JSON.stringify({ markdown });
}

function createDiagnosticsHolder(): DecisionArtifactDiagnosticsHolder {
  return { value: null };
}

describe("generateOllamaDecisionBrief (split-stage, #154)", () => {
  beforeEach(() => {
    mockOllamaGenerate.mockReset();
  });

  it("uses the runtime-neutral Markdown-only exact JSON Schema", async () => {
    mockOllamaGenerate.mockResolvedValue(markdownOnlyEnvelope(buildValidMarkdown()));

    await generateOllamaDecisionBrief(baseInput);

    expect(mockOllamaGenerate.mock.calls[0]?.[0]).toMatchObject({
      format: DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA,
      temperature: 0,
      think: false,
    });
  });

  it("uses the Markdown-only prompt, not the combined envelope prompt", async () => {
    mockOllamaGenerate.mockResolvedValue(markdownOnlyEnvelope(buildValidMarkdown()));

    await generateOllamaDecisionBrief(baseInput);

    const prompt = mockOllamaGenerate.mock.calls[0]?.[0]?.prompt as string;
    expect(prompt).toContain("Return a single JSON object with one top-level field:");
    expect(prompt).not.toContain("Decision Trace rules:");
    expect(prompt).not.toContain("basis.intent must name");
  });

  it("accepts complete, aligned Markdown on the first attempt with no retry", async () => {
    mockOllamaGenerate.mockResolvedValue(markdownOnlyEnvelope(buildValidMarkdown()));
    const diagnostics = createDiagnosticsHolder();

    const result = await generateOllamaDecisionBrief(baseInput, { diagnostics });

    expect(result.markdown).toContain("# Decision Brief");
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(1);
    expect(diagnostics.value).toMatchObject({
      strategy: "split_stage",
      markdownAttemptCount: 1,
      markdownRetryReasonCategory: "none",
      traceConstructionStrategy: "source_bound_projection",
      totalModelCallCount: 1,
    });
  });

  it("retries once when a required section is missing, then succeeds", async () => {
    mockOllamaGenerate
      .mockResolvedValueOnce(markdownOnlyEnvelope(buildValidMarkdown({ omitRisksSection: true })))
      .mockResolvedValueOnce(markdownOnlyEnvelope(buildValidMarkdown()));
    const diagnostics = createDiagnosticsHolder();

    const result = await generateOllamaDecisionBrief(baseInput, { diagnostics });

    expect(result.markdown).toContain("# Decision Brief");
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(2);
    expect(diagnostics.value?.markdownAttemptCount).toBe(2);
    expect(diagnostics.value?.markdownRetryReasonCategory).toBe("required_sections");
  });

  it("retries once on a recommendation mismatch, then succeeds", async () => {
    mockOllamaGenerate
      .mockResolvedValueOnce(
        markdownOnlyEnvelope(buildValidMarkdown({ recommendation: "Do something unrelated instead." })),
      )
      .mockResolvedValueOnce(markdownOnlyEnvelope(buildValidMarkdown()));
    const diagnostics = createDiagnosticsHolder();

    const result = await generateOllamaDecisionBrief(baseInput, { diagnostics });

    expect(result.markdown).toContain(captureLayer.recommendation_candidate);
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(2);
    expect(diagnostics.value?.markdownRetryReasonCategory).toBe("recommendation_alignment");
  });

  it("retries once when next steps are uncovered, then succeeds", async () => {
    mockOllamaGenerate
      .mockResolvedValueOnce(
        markdownOnlyEnvelope(buildValidMarkdown({ nextSteps: ["A completely different plan."] })),
      )
      .mockResolvedValueOnce(markdownOnlyEnvelope(buildValidMarkdown()));
    const diagnostics = createDiagnosticsHolder();

    const result = await generateOllamaDecisionBrief(baseInput, { diagnostics });

    expect(result.markdown).toContain("# Decision Brief");
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(2);
    expect(diagnostics.value?.markdownRetryReasonCategory).toBe("next_step_alignment");
  });

  it("retries once on a writing hard failure (em dash), then succeeds", async () => {
    mockOllamaGenerate
      .mockResolvedValueOnce(
        markdownOnlyEnvelope(
          buildValidMarkdown({ riskSentence: "The platform team — without senior engineers — may slip." }),
        ),
      )
      .mockResolvedValueOnce(markdownOnlyEnvelope(buildValidMarkdown()));
    const diagnostics = createDiagnosticsHolder();

    const result = await generateOllamaDecisionBrief(baseInput, { diagnostics });

    expect(result.markdown).not.toContain("—");
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(2);
    expect(diagnostics.value?.markdownRetryReasonCategory).toBe("writing_hard_failure");
  });

  it("includes concise validator findings in the retry prompt, not the raw rejected output", async () => {
    const firstMarkdown = buildValidMarkdown({ omitRisksSection: true });
    mockOllamaGenerate
      .mockResolvedValueOnce(markdownOnlyEnvelope(firstMarkdown))
      .mockResolvedValueOnce(markdownOnlyEnvelope(buildValidMarkdown()));

    await generateOllamaDecisionBrief(baseInput);

    const retryPrompt = mockOllamaGenerate.mock.calls[1]?.[0]?.prompt as string;
    expect(retryPrompt).toContain("Missing required sections");
    expect(retryPrompt.toLowerCase()).toContain("risks and constraints");
    // The raw rejected Markdown body must not be echoed back wholesale.
    expect(retryPrompt).not.toContain(firstMarkdown);
  });

  it("stops after one failed semantic retry and throws a typed contract error", async () => {
    mockOllamaGenerate.mockResolvedValue(
      markdownOnlyEnvelope(buildValidMarkdown({ omitRisksSection: true })),
    );
    const diagnostics = createDiagnosticsHolder();

    await expect(generateOllamaDecisionBrief(baseInput, { diagnostics })).rejects.toBeInstanceOf(
      DecisionBriefContractError,
    );

    expect(mockOllamaGenerate).toHaveBeenCalledTimes(2);
  });

  it("does not retry cancellation", async () => {
    mockOllamaGenerate.mockRejectedValue(new GenerationCancelledError());

    await expect(
      generateOllamaDecisionBrief(baseInput, { signal: new AbortController().signal }),
    ).rejects.toBeInstanceOf(GenerationCancelledError);

    expect(mockOllamaGenerate).toHaveBeenCalledTimes(1);
  });

  it("does not retry on timeout", async () => {
    mockOllamaGenerate.mockRejectedValue(new Error("Ollama request timed out after 120000ms."));

    await expect(generateOllamaDecisionBrief(baseInput)).rejects.toThrow("timed out");
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(1);
  });

  it("does not retry on network failure", async () => {
    mockOllamaGenerate.mockRejectedValue(new TypeError("fetch failed"));

    await expect(generateOllamaDecisionBrief(baseInput)).rejects.toThrow("fetch failed");
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(1);
  });

  it("builds a valid Decision Trace deterministically alongside the accepted Markdown", async () => {
    mockOllamaGenerate.mockResolvedValue(markdownOnlyEnvelope(buildValidMarkdown()));

    const result = await generateOllamaDecisionBrief(baseInput);

    expect(result.decisionTrace.entries.length).toBeGreaterThan(0);
    expect(
      result.decisionTrace.entries.find((entry) => entry.kind === "recommendation")?.statement,
    ).toBe(captureLayer.recommendation_candidate);
  });
});
