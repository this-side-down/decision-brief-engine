import { describe, expect, it } from "vitest";
import { EXECUTION_DECISION_BRIEF } from "../../../data/briefTypes";
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
    expect(parsed.sourceRange).toEqual({ start: 0, end: 44 });
    expect(parsed.evidence[0]).toMatchObject({
      text: "Support queue averaged 18 minutes last week.",
      sourceChunkId: "chunk-001",
      sourceRange: { start: 0, end: 44 },
    });
    expect(parsed.conflicts[0].sourceChunkIds).toEqual(["chunk-001"]);
    expect(parsed.unresolved_references[0].sourceChunkId).toBe("chunk-001");
  });

  it("rejects instructional placeholder text", () => {
    expect(() =>
      parsePartialCaptureSignalsJson(
        JSON.stringify({
          ...validEnvelope,
          implied_decision: "TODO fill this in",
        }),
        baseInput,
      ),
    ).toThrow(/placeholder text/i);
  });

  it("rejects invalid confidence values", () => {
    expect(() =>
      parsePartialCaptureSignalsJson(
        JSON.stringify({
          ...validEnvelope,
          confidence: "Uncertain",
        }),
        baseInput,
      ),
    ).toThrow(/confidence must be/i);
  });
});
