import { describe, expect, it } from "vitest";
import { EXECUTION_DECISION_BRIEF } from "../../../data/briefTypes";
import { ChunkExtractionContractError } from "./chunkExtractionErrors";
import { parsePartialCaptureSignalsJson } from "./parsePartialCaptureSignals";
import type { ChunkExtractionInput } from "./types";

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

describe("parsePartialCaptureSignalsJson", () => {
  it("parses a valid chunk envelope and attaches chunk metadata", () => {
    const parsed = parsePartialCaptureSignalsJson(
      JSON.stringify(validEnvelope),
      baseInput,
    );

    expect(parsed.chunkId).toBe("chunk-001");
    expect(parsed.evidence[0]).toMatchObject({
      text: "Support queue averaged 18 minutes last week.",
      sourceChunkId: "chunk-001",
    });
  });

  it("empties an ungrounded stated decision while preserving the envelope", () => {
    const parsed = parsePartialCaptureSignalsJson(
      JSON.stringify({
        ...validEnvelope,
        stated_decision: "Proceed with a broad regional launch.",
      }),
      baseInput,
    );

    expect(parsed.stated_decision).toBe("");
    expect(parsed.implied_decision).toBe(validEnvelope.implied_decision);
  });

  it("accepts legitimate technical content containing schema", () => {
    const parsed = parsePartialCaptureSignalsJson(
      JSON.stringify({
        ...validEnvelope,
        decision_context:
          "Team discussed API schema alignment before the regional launch.",
        evidence: [
          "Database schema review is scheduled before routing changes.",
        ],
      }),
      baseInput,
    );

    expect(parsed.decision_context).toContain("API schema alignment");
    expect(parsed.evidence[0]?.text).toContain("Database schema review");
  });

  it("rejects copied instructional placeholder text", () => {
    expect(() =>
      parsePartialCaptureSignalsJson(
        JSON.stringify({
          ...validEnvelope,
          implied_decision: "Return only the JSON object",
        }),
        baseInput,
      ),
    ).toThrow(ChunkExtractionContractError);

    expect(() =>
      parsePartialCaptureSignalsJson(
        JSON.stringify({
          ...validEnvelope,
          goals: ["Use this schema as a template"],
        }),
        baseInput,
      ),
    ).toThrow(ChunkExtractionContractError);
  });

  it("throws ChunkExtractionContractError for invalid JSON", () => {
    expect(() => parsePartialCaptureSignalsJson("{", baseInput)).toThrow(
      ChunkExtractionContractError,
    );
  });

  it("throws ChunkExtractionContractError when top-level JSON is an array", () => {
    expect(() => parsePartialCaptureSignalsJson("[]", baseInput)).toThrow(
      ChunkExtractionContractError,
    );
  });

  it("throws ChunkExtractionContractError for missing required fields", () => {
    const { goals: _goals, ...missingGoals } = validEnvelope;
    expect(() =>
      parsePartialCaptureSignalsJson(JSON.stringify(missingGoals), baseInput),
    ).toThrow(ChunkExtractionContractError);
  });

  it("throws ChunkExtractionContractError for wrong field types", () => {
    expect(() =>
      parsePartialCaptureSignalsJson(
        JSON.stringify({ ...validEnvelope, goals: "not-an-array" }),
        baseInput,
      ),
    ).toThrow(ChunkExtractionContractError);
  });

  it("throws ChunkExtractionContractError for invalid confidence values", () => {
    expect(() =>
      parsePartialCaptureSignalsJson(
        JSON.stringify({ ...validEnvelope, confidence: "Uncertain" }),
        baseInput,
      ),
    ).toThrow(ChunkExtractionContractError);
  });
});
