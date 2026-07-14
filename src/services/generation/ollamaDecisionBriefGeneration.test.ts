import { beforeEach, describe, expect, it, vi } from "vitest";
import { getExampleFixture } from "../../data/exampleFixtures";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import { ollamaGenerate } from "./ollamaClient";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";
import { DECISION_BRIEF_MARKDOWN_STRUCTURE } from "./types";
import { GenerationCancelledError } from "./webGpuErrors";
import {
  generateOllamaDecisionBrief,
  ollamaDecisionArtifactDiagnosticsHolder,
} from "./ollamaDecisionBriefGeneration";

vi.mock("./ollamaClient", () => ({
  ollamaGenerate: vi.fn(),
}));

const mockedOllamaGenerate = vi.mocked(ollamaGenerate);

const fixture = getExampleFixture("q4-workforce-allocation")!;

const baseInput = {
  captureLayer: fixture.expectedCaptureLayer,
  briefType: STRATEGY_DECISION_BRIEF,
  briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
  markdownStructure: [...DECISION_BRIEF_MARKDOWN_STRUCTURE],
  toneGuidance: "Concise",
  sourceLabel: "demo:q4-workforce-allocation",
};

const VALID_BASIS = {
  intent: "Allocate engineering capacity.",
  supporting_evidence: ["Q4 hospital deadline is fixed."],
  assumptions_relied_on: [],
  risks_addressed: [],
  risks_accepted: [],
  constraints_respected: [],
  tradeoffs: [],
  alternatives_considered: [],
  missing_context_caveats: [],
};

const validEnvelope = {
  markdown: "# Decision Brief\n\n## Summary\nAllocate senior engineers to the hospital project.",
  decisionTrace: {
    entries: [
      {
        statement: "Prioritize hospital project staffing.",
        kind: "recommendation",
        basis: VALID_BASIS,
        confidence: "Medium",
        would_change_if: ["If the hospital deadline moves beyond Q4."],
      },
    ],
    created_at: "2026-01-01T00:00:00.000Z",
  },
};

describe("generateOllamaDecisionBrief", () => {
  beforeEach(() => {
    mockedOllamaGenerate.mockReset();
    ollamaDecisionArtifactDiagnosticsHolder.value = null;
  });

  it("returns a valid combined result on first attempt", async () => {
    mockedOllamaGenerate.mockResolvedValue(JSON.stringify(validEnvelope));

    const result = await generateOllamaDecisionBrief(baseInput);

    expect(result.markdown).toContain("# Decision Brief");
    expect(result.decisionTrace.entries).toHaveLength(1);
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(1);
    expect(mockedOllamaGenerate.mock.calls[0]?.[0]).toMatchObject({
      think: false,
      temperature: 0,
    });
    expect(ollamaDecisionArtifactDiagnosticsHolder.value).toMatchObject({
      strategy: "combined",
      briefRetryCount: 0,
      traceRetryCount: null,
    });
  });

  it("retries once after contract failure and succeeds on second attempt", async () => {
    mockedOllamaGenerate
      .mockResolvedValueOnce(JSON.stringify({ markdown: "", decisionTrace: validEnvelope.decisionTrace }))
      .mockResolvedValueOnce(JSON.stringify(validEnvelope));

    const result = await generateOllamaDecisionBrief(baseInput);

    expect(result.markdown).toContain("# Decision Brief");
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(2);
    expect(ollamaDecisionArtifactDiagnosticsHolder.value?.briefRetryCount).toBe(1);
  });

  it("stops after the second contract failure", async () => {
    mockedOllamaGenerate
      .mockResolvedValueOnce(JSON.stringify({ markdown: "", decisionTrace: validEnvelope.decisionTrace }))
      .mockResolvedValueOnce(JSON.stringify({ markdown: "   ", decisionTrace: validEnvelope.decisionTrace }));

    await expect(generateOllamaDecisionBrief(baseInput)).rejects.toBeInstanceOf(
      DecisionBriefContractError,
    );
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(2);
  });

  it("does not retry on cancellation", async () => {
    mockedOllamaGenerate.mockRejectedValue(new GenerationCancelledError());

    await expect(generateOllamaDecisionBrief(baseInput)).rejects.toBeInstanceOf(
      GenerationCancelledError,
    );
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(1);
  });

  it("does not retry on timeout", async () => {
    mockedOllamaGenerate.mockRejectedValue(
      new Error("Ollama request timed out after 120000ms."),
    );

    await expect(generateOllamaDecisionBrief(baseInput)).rejects.toThrow("timed out");
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(1);
  });

  it("does not retry on network failure", async () => {
    mockedOllamaGenerate.mockRejectedValue(new TypeError("fetch failed"));

    await expect(generateOllamaDecisionBrief(baseInput)).rejects.toThrow("fetch failed");
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(1);
  });
});

describe("diagnoseDecisionBriefResponseShape", () => {
  it("summarizes legacy empty-markdown failure shape without raw text", async () => {
    const { diagnoseDecisionBriefResponseShape } = await import(
      "./diagnoseDecisionBriefResponseShape"
    );

    const diagnosis = diagnoseDecisionBriefResponseShape(
      JSON.stringify({
        decisionTrace: validEnvelope.decisionTrace,
      }),
    );

    expect(diagnosis.parseableJson).toBe(true);
    expect(diagnosis.markdownPresent).toBe(false);
    expect(diagnosis.decisionTracePresent).toBe(true);
    expect(diagnosis.topLevelKeys).toEqual(["decisionTrace"]);
  });
});
