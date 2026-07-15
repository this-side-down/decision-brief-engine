import { describe, expect, it } from "vitest";
import { PRODUCT_DECISION_BRIEF } from "../../../data/briefTypes";
import { mergePartialCaptureSignals } from "./mergePartialSignals";
import { acceptChunkStatedDecision } from "./statedDecisionHygiene";
import type { LongInputPlan, PartialCaptureSignals } from "./types";

describe("chunk stated-decision hygiene", () => {
  it("rejects explicit no-decision language", () => {
    expect(
      acceptChunkStatedDecision(
        "No decision today.",
        "The team reviewed both options. No decision today.",
      ),
    ).toBe("");
    expect(
      acceptChunkStatedDecision(
        "No final architecture decision today No stated final decision today",
        "There is no final architecture decision today. No stated final decision today.",
      ),
    ).toBe("");
  });

  it("rejects a recommendation without a decision", () => {
    expect(
      acceptChunkStatedDecision(
        "Pursue the Helix modular-monolith path.",
        "Recommendation: pursue the Helix modular-monolith path.",
      ),
    ).toBe("");
  });

  it("rejects tentative alignment without commitment", () => {
    expect(
      acceptChunkStatedDecision(
        "Adopt the pilot-first path.",
        "We are tentatively aligned on the pilot-first path, pending finance review.",
      ),
    ).toBe("");
  });

  it("preserves a grounded prior decision despite a currently undecided discussion", () => {
    expect(
      acceptChunkStatedDecision(
        "Use Alpha for the billing migration.",
        "We decided last month to use Alpha for the billing migration. Today there is no final decision on the launch date.",
      ),
    ).toBe("Use Alpha for the billing migration.");
  });

  it("preserves one genuine explicit decision late in a chunk", () => {
    expect(
      acceptChunkStatedDecision(
        "Proceed with a limited pilot on April 14 with 12 accounts in Singapore and Sydney.",
        "Support remains constrained. Recommendation was pilot-first. Final decision for the record: we are proceeding with a limited pilot on April 14 with 12 accounts in Singapore and Sydney.",
      ),
    ).toBe(
      "Proceed with a limited pilot on April 14 with 12 accounts in Singapore and Sydney.",
    );
  });
});

function partial(
  chunkId: string,
  statedDecision: string,
  sourceRange: { start: number; end: number },
): PartialCaptureSignals {
  return {
    chunkId,
    sourceRange,
    stated_decision: statedDecision,
    implied_decision: "Whether to proceed with the launch.",
    goals: [],
    stakeholders: [],
    options_considered: [],
    constraints: [],
    risks: [],
    assumptions: [],
    evidence: [
      { text: `Evidence from ${chunkId}`, sourceChunkId: chunkId, sourceRange },
    ],
    open_questions: [],
    tensions: [],
    missing_context: [],
    suggested_next_steps: [],
    conflicts: [],
    unresolved_references: [],
  };
}

function planFor(texts: string[]): LongInputPlan {
  let offset = 0;
  const chunks = texts.map((text, index) => {
    const start = offset;
    offset += text.length;
    return {
      id: `chunk-${String(index + 1).padStart(3, "0")}`,
      index,
      text,
      sourceRange: { start, end: offset },
      boundaryKind: "speaker_turn" as const,
    };
  });
  return { strategy: "hierarchical", chunks, totalSourceLength: offset };
}

describe("merged stated-decision hygiene", () => {
  it("deduplicates repeated compatible explicit decisions", () => {
    const texts = [
      "Decision: proceed with the limited pilot on April 14.",
      "The team decided to proceed with the limited pilot on April 14.",
    ];
    const plan = planFor(texts);
    const decision = "Proceed with the limited pilot on April 14.";
    const merged = mergePartialCaptureSignals({
      plan,
      partialResults: plan.chunks.map((chunk) =>
        partial(chunk.id, decision, chunk.sourceRange),
      ),
      briefType: PRODUCT_DECISION_BRIEF,
      fullSourceText: texts.join(""),
    });

    expect(merged.stated_decision).toBe(decision);
  });

  it("surfaces conflicting explicit decisions instead of flattening them", () => {
    const texts = [
      "The team decided to launch on Monday.",
      "The team decided not to launch on Monday.",
    ];
    const plan = planFor(texts);
    const decisions = ["Launch on Monday.", "Do not launch on Monday."];
    const merged = mergePartialCaptureSignals({
      plan,
      partialResults: plan.chunks.map((chunk, index) =>
        partial(chunk.id, decisions[index], chunk.sourceRange),
      ),
      briefType: PRODUCT_DECISION_BRIEF,
      fullSourceText: texts.join(""),
    });

    expect(merged.stated_decision).toBe("");
    expect(merged.tensions.join(" ")).toContain("Conflicting explicit decisions");
    expect(merged.tensions.join(" ")).toContain("Launch on Monday");
    expect(merged.tensions.join(" ")).toContain("Do not launch on Monday");
  });
});
