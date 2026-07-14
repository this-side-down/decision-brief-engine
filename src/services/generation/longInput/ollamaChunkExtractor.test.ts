import { beforeEach, describe, expect, it, vi } from "vitest";
import { EXECUTION_DECISION_BRIEF } from "../../../data/briefTypes";
import { ollamaGenerate } from "../ollamaClient";
import { GenerationCancelledError } from "../webGpuErrors";
import { ChunkExtractionContractError } from "./chunkExtractionErrors";
import { extractOllamaChunkSignals } from "./ollamaChunkExtractor";
import type { ChunkExtractionInput } from "./types";

vi.mock("../ollamaClient", () => ({
  ollamaGenerate: vi.fn(),
}));

const mockedOllamaGenerate = vi.mocked(ollamaGenerate);

const baseInput: ChunkExtractionInput = {
  chunk: {
    id: "chunk-001",
    index: 0,
    text: "Support queue averaged 18 minutes last week.",
    sourceRange: { start: 0, end: 44 },
    boundaryKind: "speaker_turn",
  },
  briefType: EXECUTION_DECISION_BRIEF,
  sourceLabel: "eval-harness:regional-launch-readiness-review",
  fullSourceText: "Support queue averaged 18 minutes last week.",
  chunkCount: 3,
};

const validEnvelope = {
  source_summary: "Support queue pressure is elevated.",
  decision_context: "Regional launch readiness review.",
  stated_decision: "",
  implied_decision: "Whether to delay the launch.",
  goals: ["Reduce support queue time"],
  stakeholders: ["Regional PM", "Support lead"],
  options_considered: ["Broad launch", "Limited pilot"],
  constraints: ["Support queue at 18 minutes"],
  risks: ["Support overload"],
  assumptions: ["Pilot accounts are manageable"],
  evidence: ["Support queue averaged 18 minutes last week."],
  open_questions: ["Can support clear the queue before launch?"],
  tensions: ["Speed versus readiness"],
  recommendation_candidate: "Run a limited pilot first.",
  confidence: "Medium",
  missing_context: ["Project Northstar staffing plan"],
  suggested_next_steps: ["Confirm support staffing"],
  conflicts: [
    {
      topic: "launch timing",
      statementA: "Launch broadly on April 7",
      statementB: "Delay until readiness clears",
    },
  ],
  unresolved_references: [
    {
      term: "Project Northstar",
      note: "Internal codename with unclear scope",
    },
  ],
};

describe("extractOllamaChunkSignals", () => {
  beforeEach(() => {
    mockedOllamaGenerate.mockReset();
  });

  it("returns retryCount 0 on first-attempt success", async () => {
    mockedOllamaGenerate.mockResolvedValue(JSON.stringify(validEnvelope));

    const result = await extractOllamaChunkSignals(baseInput);

    expect(result.retryCount).toBe(0);
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(1);
    expect(mockedOllamaGenerate.mock.calls[0]?.[0]).toMatchObject({
      think: false,
      temperature: 0,
    });
  });

  it("retries once for invalid JSON and succeeds on the second attempt", async () => {
    mockedOllamaGenerate
      .mockResolvedValueOnce("{")
      .mockResolvedValueOnce(JSON.stringify(validEnvelope));

    const result = await extractOllamaChunkSignals(baseInput);

    expect(result.retryCount).toBe(1);
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(2);
  });

  it("retries once for valid JSON array responses", async () => {
    mockedOllamaGenerate
      .mockResolvedValueOnce("[]")
      .mockResolvedValueOnce(JSON.stringify(validEnvelope));

    const result = await extractOllamaChunkSignals(baseInput);

    expect(result.retryCount).toBe(1);
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(2);
  });

  it("retries once for missing required fields", async () => {
    const { goals: _goals, ...missingGoals } = validEnvelope;
    mockedOllamaGenerate
      .mockResolvedValueOnce(JSON.stringify(missingGoals))
      .mockResolvedValueOnce(JSON.stringify(validEnvelope));

    const result = await extractOllamaChunkSignals(baseInput);

    expect(result.retryCount).toBe(1);
  });

  it("retries once for wrong field types", async () => {
    mockedOllamaGenerate
      .mockResolvedValueOnce(
        JSON.stringify({ ...validEnvelope, goals: "not-an-array" }),
      )
      .mockResolvedValueOnce(JSON.stringify(validEnvelope));

    const result = await extractOllamaChunkSignals(baseInput);

    expect(result.retryCount).toBe(1);
  });

  it("stops after one retry when the second response still violates the contract", async () => {
    mockedOllamaGenerate.mockResolvedValue("[]");

    await expect(extractOllamaChunkSignals(baseInput)).rejects.toBeInstanceOf(
      ChunkExtractionContractError,
    );
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(2);
  });

  it("does not retry cancellation failures", async () => {
    mockedOllamaGenerate.mockRejectedValue(new GenerationCancelledError());

    await expect(extractOllamaChunkSignals(baseInput)).rejects.toBeInstanceOf(
      GenerationCancelledError,
    );
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(1);
  });

  it("does not retry timeout failures", async () => {
    mockedOllamaGenerate.mockRejectedValue(
      new Error("Ollama request timed out after 120000ms."),
    );

    await expect(extractOllamaChunkSignals(baseInput)).rejects.toThrow(/timed out/i);
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(1);
  });

  it("does not retry network failures", async () => {
    mockedOllamaGenerate.mockRejectedValue(
      new Error("Ollama request failed (500)."),
    );

    await expect(extractOllamaChunkSignals(baseInput)).rejects.toThrow(
      /request failed/i,
    );
    expect(mockedOllamaGenerate).toHaveBeenCalledTimes(1);
  });
});
