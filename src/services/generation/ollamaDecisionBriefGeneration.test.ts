import { beforeEach, describe, expect, it, vi } from "vitest";
import { getExampleFixture } from "../../data/exampleFixtures";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import { ollamaGenerate } from "./ollamaClient";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";
import type { DecisionArtifactDiagnosticsHolder } from "./decisionArtifactDiagnostics";
import { DECISION_BRIEF_MARKDOWN_STRUCTURE } from "./types";
import { GenerationCancelledError } from "./webGpuErrors";
import { generateOllamaDecisionBrief } from "./ollamaDecisionBriefGeneration";

vi.mock("./ollamaClient", () => ({
  ollamaGenerate: vi.fn(),
}));

const mockOllamaGenerate = vi.mocked(ollamaGenerate);

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

function createDiagnosticsHolder(): DecisionArtifactDiagnosticsHolder {
  return { value: null };
}

describe("generateOllamaDecisionBrief", () => {
  beforeEach(() => {
    mockOllamaGenerate.mockReset();
  });

  it("returns a valid combined result on first attempt", async () => {
    mockOllamaGenerate.mockResolvedValue(JSON.stringify(validEnvelope));
    const diagnostics = createDiagnosticsHolder();

    const result = await generateOllamaDecisionBrief(baseInput, { diagnostics });

    expect(result.markdown).toContain("# Decision Brief");
    expect(result.decisionTrace.entries).toHaveLength(1);
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(1);
    expect(mockOllamaGenerate.mock.calls[0]?.[0]).toMatchObject({
      think: false,
      temperature: 0,
    });
    expect(diagnostics.value).toMatchObject({
      strategy: "combined",
      briefRetryCount: 0,
      traceRetryCount: null,
    });
  });

  it("works normally without a diagnostics holder", async () => {
    mockOllamaGenerate.mockResolvedValue(JSON.stringify(validEnvelope));

    const result = await generateOllamaDecisionBrief(baseInput);

    expect(result.markdown).toContain("# Decision Brief");
  });

  it("retries once after contract failure and succeeds on second attempt", async () => {
    mockOllamaGenerate
      .mockResolvedValueOnce(JSON.stringify({ markdown: "", decisionTrace: validEnvelope.decisionTrace }))
      .mockResolvedValueOnce(JSON.stringify(validEnvelope));
    const diagnostics = createDiagnosticsHolder();

    const result = await generateOllamaDecisionBrief(baseInput, { diagnostics });

    expect(result.markdown).toContain("# Decision Brief");
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(2);
    expect(diagnostics.value?.briefRetryCount).toBe(1);
  });

  it("records retry count and elapsed time on final contract failure", async () => {
    mockOllamaGenerate
      .mockResolvedValueOnce(JSON.stringify({ markdown: "", decisionTrace: validEnvelope.decisionTrace }))
      .mockResolvedValueOnce(JSON.stringify({ markdown: "   ", decisionTrace: validEnvelope.decisionTrace }));
    const diagnostics = createDiagnosticsHolder();

    await expect(
      generateOllamaDecisionBrief(baseInput, { diagnostics }),
    ).rejects.toBeInstanceOf(DecisionBriefContractError);

    expect(mockOllamaGenerate).toHaveBeenCalledTimes(2);
    expect(diagnostics.value).toMatchObject({
      strategy: "combined",
      briefRetryCount: 1,
    });
    expect(diagnostics.value?.briefGenerationLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("does not let two holders overwrite each other", async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    mockOllamaGenerate
      .mockImplementationOnce(async () => {
        await firstGate;
        return JSON.stringify(validEnvelope);
      })
      .mockResolvedValueOnce(JSON.stringify(validEnvelope));

    const firstDiagnostics = createDiagnosticsHolder();
    const secondDiagnostics = createDiagnosticsHolder();

    const firstPromise = generateOllamaDecisionBrief(baseInput, {
      diagnostics: firstDiagnostics,
    });
    const secondPromise = generateOllamaDecisionBrief(baseInput, {
      diagnostics: secondDiagnostics,
    });

    await secondPromise;
    expect(secondDiagnostics.value?.briefRetryCount).toBe(0);

    releaseFirst();
    await firstPromise;
    expect(firstDiagnostics.value?.briefRetryCount).toBe(0);
  });

  it("does not leak diagnostics from a prior invocation into the next holder", async () => {
    mockOllamaGenerate.mockResolvedValue(JSON.stringify(validEnvelope));

    const firstDiagnostics = createDiagnosticsHolder();
    await generateOllamaDecisionBrief(baseInput, { diagnostics: firstDiagnostics });

    const secondDiagnostics = createDiagnosticsHolder();
    await generateOllamaDecisionBrief(baseInput, { diagnostics: secondDiagnostics });

    expect(firstDiagnostics.value?.briefRetryCount).toBe(0);
    expect(secondDiagnostics.value?.briefRetryCount).toBe(0);
    expect(secondDiagnostics.value?.briefGenerationLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("does not retry on cancellation", async () => {
    mockOllamaGenerate.mockRejectedValue(new GenerationCancelledError());
    const diagnostics = createDiagnosticsHolder();

    await expect(
      generateOllamaDecisionBrief(baseInput, { diagnostics, signal: new AbortController().signal }),
    ).rejects.toBeInstanceOf(GenerationCancelledError);

    expect(mockOllamaGenerate).toHaveBeenCalledTimes(1);
    expect(diagnostics.value?.briefGenerationLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("passes AbortSignal to ollamaGenerate", async () => {
    mockOllamaGenerate.mockResolvedValue(JSON.stringify(validEnvelope));
    const controller = new AbortController();

    await generateOllamaDecisionBrief(baseInput, { signal: controller.signal });

    expect(mockOllamaGenerate.mock.calls[0]?.[0]).toMatchObject({
      signal: controller.signal,
    });
  });

  it("does not retry on timeout", async () => {
    mockOllamaGenerate.mockRejectedValue(
      new Error("Ollama request timed out after 120000ms."),
    );
    const diagnostics = createDiagnosticsHolder();

    await expect(generateOllamaDecisionBrief(baseInput, { diagnostics })).rejects.toThrow(
      "timed out",
    );
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(1);
    expect(diagnostics.value?.briefGenerationLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("does not retry on network failure", async () => {
    mockOllamaGenerate.mockRejectedValue(new TypeError("fetch failed"));
    const diagnostics = createDiagnosticsHolder();

    await expect(generateOllamaDecisionBrief(baseInput, { diagnostics })).rejects.toThrow(
      "fetch failed",
    );
    expect(mockOllamaGenerate).toHaveBeenCalledTimes(1);
    expect(diagnostics.value?.briefGenerationLatencyMs).toBeGreaterThanOrEqual(0);
  });
});
