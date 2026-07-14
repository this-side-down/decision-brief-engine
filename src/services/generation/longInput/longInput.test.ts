import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { PRODUCT_DECISION_BRIEF, STRATEGY_DECISION_BRIEF } from "../../../data/briefTypes";
import { demoExampleSourceLabel } from "../../../data/demoExamples";
import q4Notes from "../../../../fixtures/examples/q4-workforce-allocation/messy-notes.md?raw";
import platformNotes from "../../../../fixtures/examples/platform-rearchitecture-review/messy-notes.md?raw";
import { GenerationCancelledError } from "../webGpuErrors";
import {
  CAPTURE_INPUT_BUDGET_POLICY,
  resolveCapturePath,
} from "./inputBudgetPolicy";
import {
  LongInputChunkFailureError,
  LongInputMergeFailureError,
  LongInputSupersededError,
} from "./longInputErrors";
import { mergePartialCaptureSignals } from "./mergePartialSignals";
import { mockLongInputCaptureCapability } from "./mockChunkExtractor";
import { planLongInput } from "./planLongInput";
import type { CaptureLayer } from "../../../types/captureLayer";
import {
  assertMergedCaptureLayerReadiness,
  runLongInputCapture,
} from "./runLongInputCapture";
import { GENERIC_MOCK_STRUCTURAL_EXPECTATIONS } from "../captureLayerStructuralReadiness";
import { segmentSourceText, validateSourceCoverage } from "./segmentSource";
import { formatLongInputProgressMessage } from "./types";

describe("long-input planning", () => {
  it("keeps ordinary gallery input on single-pass capture", () => {
    expect(resolveCapturePath(q4Notes)).toBe("single_pass");
    const plan = planLongInput(q4Notes);
    expect(plan.strategy).toBe("single_pass");
    expect(plan.chunks).toHaveLength(0);
  });

  it("routes long input to hierarchical capture", () => {
    expect(resolveCapturePath(platformNotes)).toBe("hierarchical");
    const plan = planLongInput(platformNotes);
    expect(plan.strategy).toBe("hierarchical");
    expect(plan.chunks.length).toBeGreaterThan(1);
  });

  it("splits on speaker turns for the long-form fixture", () => {
    const chunks = segmentSourceText(platformNotes);
    expect(chunks.some((chunk) => chunk.boundaryKind === "speaker_turn")).toBe(
      true,
    );
  });

  it("falls back to smaller boundaries when needed", () => {
    const repeatedParagraph = "Latency evidence without paragraph breaks. ".repeat(
      120,
    );
    const chunks = segmentSourceText(repeatedParagraph, {
      maxChunkChars: 500,
      minChunkChars: 100,
    });
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.some((chunk) => chunk.boundaryKind === "fallback")).toBe(true);
  });

  it("produces stable chunk ordering and identifiers", () => {
    const first = planLongInput(platformNotes);
    const second = planLongInput(platformNotes);
    expect(second.chunks.map((chunk) => chunk.id)).toEqual(
      first.chunks.map((chunk) => chunk.id),
    );
    expect(second.chunks.map((chunk) => chunk.index)).toEqual(
      first.chunks.map((_, index) => index),
    );
  });

  it("covers the full source range without gaps", () => {
    const plan = planLongInput(platformNotes);
    const coverage = validateSourceCoverage(
      platformNotes.replace(/\r\n/g, "\n").trim(),
      plan.chunks,
    );
    expect(coverage.complete).toBe(true);
    expect(coverage.gaps).toHaveLength(0);
  });
});

describe("long-input merge and orchestration", () => {
  it("preserves beginning, middle, and end evidence", async () => {
    const { captureLayer } = await runLongInputCapture({
      input: {
        rawInputText: platformNotes,
        briefType: PRODUCT_DECISION_BRIEF,
        briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
        captureLayerFields: [],
        sourceLabel: demoExampleSourceLabel("platform-rearchitecture-review"),
      },
      capability: mockLongInputCaptureCapability,
    });

    const evidence = captureLayer.evidence.join(" ").toLowerCase();
    expect(evidence).toMatch(/800ms|checkout/);
    expect(evidence).toMatch(/invoice generation|lighthouse/);
    expect(evidence).toMatch(/940ms|northwind/);
  });

  it("consolidates duplicates without erasing materially different evidence", () => {
    const merged = mergePartialCaptureSignals({
      plan: planLongInput(platformNotes),
      partialResults: [
        {
          chunkId: "chunk-001",
          sourceRange: { start: 0, end: 10 },
          goals: ["Reduce latency"],
          stakeholders: [],
          options_considered: [],
          constraints: [],
          risks: [],
          assumptions: [],
          evidence: [
            {
              text: "Checkout latency remains above target",
              sourceChunkId: "chunk-001",
              sourceRange: { start: 0, end: 10 },
            },
          ],
          open_questions: [],
          tensions: [],
          missing_context: [],
          suggested_next_steps: [],
          conflicts: [],
          unresolved_references: [],
          implied_decision: "Whether to refactor now",
        },
        {
          chunkId: "chunk-002",
          sourceRange: { start: 10, end: 20 },
          goals: ["Reduce latency"],
          stakeholders: [],
          options_considered: [],
          constraints: [],
          risks: [],
          assumptions: [],
          evidence: [
            {
              text: "Invoice generation queue depth doubled during backfill",
              sourceChunkId: "chunk-002",
              sourceRange: { start: 10, end: 20 },
            },
          ],
          open_questions: [],
          tensions: [],
          missing_context: [],
          suggested_next_steps: [],
          conflicts: [],
          unresolved_references: [],
        },
      ],
      briefType: PRODUCT_DECISION_BRIEF,
      fullSourceText: platformNotes,
    });

    expect(merged.goals).toEqual(["Reduce latency"]);
    expect(merged.evidence).toHaveLength(2);
  });

  it("preserves conflicts and unresolved references", async () => {
    const { captureLayer } = await runLongInputCapture({
      input: {
        rawInputText: platformNotes,
        briefType: PRODUCT_DECISION_BRIEF,
        briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
        captureLayerFields: [],
        sourceLabel: demoExampleSourceLabel("platform-rearchitecture-review"),
      },
      capability: mockLongInputCaptureCapability,
    });

    expect(captureLayer.tensions.join(" ")).toMatch(/Omar/i);
    expect(captureLayer.missing_context.join(" ")).toMatch(/Helix/i);
  });

  it("does not invent a stated decision for the long-form fixture", async () => {
    const { captureLayer } = await runLongInputCapture({
      input: {
        rawInputText: platformNotes,
        briefType: PRODUCT_DECISION_BRIEF,
        briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
        captureLayerFields: [],
        sourceLabel: demoExampleSourceLabel("platform-rearchitecture-review"),
      },
      capability: mockLongInputCaptureCapability,
    });

    expect(captureLayer.stated_decision.trim()).toBe("");
    expect(captureLayer.implied_decision.trim().length).toBeGreaterThan(0);
  });

  it("fails merge when no decision signals survive", () => {
    expect(() =>
      mergePartialCaptureSignals({
        plan: planLongInput(platformNotes),
        partialResults: [
          {
            chunkId: "chunk-001",
            sourceRange: { start: 0, end: 10 },
            goals: [],
            stakeholders: [],
            options_considered: [],
            constraints: [],
            risks: [],
            assumptions: [],
            evidence: [
              {
                text: "Only one evidence item",
                sourceChunkId: "chunk-001",
                sourceRange: { start: 0, end: 10 },
              },
            ],
            open_questions: [],
            tensions: [],
            missing_context: [],
            suggested_next_steps: [],
            conflicts: [],
            unresolved_references: [],
          },
        ],
        briefType: PRODUCT_DECISION_BRIEF,
        fullSourceText: platformNotes,
      }),
    ).toThrow(LongInputMergeFailureError);
  });

  it("surfaces partial chunk failure without returning a Capture Layer", async () => {
    await expect(
      runLongInputCapture({
        input: {
          rawInputText: platformNotes,
          briefType: PRODUCT_DECISION_BRIEF,
          briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
          captureLayerFields: [],
          sourceLabel: demoExampleSourceLabel("platform-rearchitecture-review"),
        },
        capability: mockLongInputCaptureCapability,
        failChunkIds: new Set(["chunk-003"]),
      }),
    ).rejects.toBeInstanceOf(LongInputChunkFailureError);
  });

  it("supports cancellation during chunk processing", async () => {
    const controller = new AbortController();
    const runPromise = runLongInputCapture({
      input: {
        rawInputText: platformNotes,
        briefType: PRODUCT_DECISION_BRIEF,
        briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
        captureLayerFields: [],
        sourceLabel: demoExampleSourceLabel("platform-rearchitecture-review"),
      },
      capability: mockLongInputCaptureCapability,
      signal: controller.signal,
      interChunkDelayMs: 20,
    });

    controller.abort();

    await expect(runPromise).rejects.toBeInstanceOf(GenerationCancelledError);
  });

  it("rejects stale chunk work after supersession", async () => {
    await expect(
      runLongInputCapture({
        input: {
          rawInputText: platformNotes,
          briefType: STRATEGY_DECISION_BRIEF,
          briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
          captureLayerFields: [],
          sourceLabel: demoExampleSourceLabel("platform-rearchitecture-review"),
        },
        capability: mockLongInputCaptureCapability,
        runId: 1,
        activeRunId: 2,
      }),
    ).rejects.toBeInstanceOf(LongInputSupersededError);
  });

  it("reports multi-stage progress messages", () => {
    expect(
      formatLongInputProgressMessage({
        phase: "processing_chunk",
        chunkIndex: 2,
        chunkCount: 5,
      }),
    ).toBe("Processing section 2 of 5…");
    expect(formatLongInputProgressMessage({ phase: "merging" })).toBe(
      "Merging decision signals…",
    );
  });

  it("centralizes the single-pass threshold in budget policy", () => {
    expect(CAPTURE_INPUT_BUDGET_POLICY.singlePassMaxRawChars).toBe(4500);
    expect(q4Notes.trim().length).toBeLessThanOrEqual(
      CAPTURE_INPUT_BUDGET_POLICY.singlePassMaxRawChars,
    );
    expect(
      readFileSync(
        "fixtures/examples/platform-rearchitecture-review/messy-notes.md",
        "utf8",
      )
        .trim()
        .length,
    ).toBeGreaterThan(CAPTURE_INPUT_BUDGET_POLICY.singlePassMaxRawChars);
  });

  it("rejects schema-valid but structurally incomplete merged Capture Layers", () => {
    const hollowCaptureLayer: CaptureLayer = {
      source_summary: "Summary only.",
      decision_context: "Some context.",
      stated_decision: "",
      implied_decision: "Clarify the primary product decision.",
      goals: [],
      stakeholders: [],
      options_considered: [],
      constraints: [],
      risks: [],
      assumptions: [],
      evidence: ["Evidence item one.", "Evidence item two."],
      open_questions: [],
      tensions: [],
      recommendation_candidate: "",
      confidence: "Medium",
      missing_context: [],
      suggested_next_steps: [],
    };

    expect(() =>
      assertMergedCaptureLayerReadiness(
        hollowCaptureLayer,
        GENERIC_MOCK_STRUCTURAL_EXPECTATIONS,
      ),
    ).toThrow(LongInputMergeFailureError);
    expect(() =>
      assertMergedCaptureLayerReadiness(
        hollowCaptureLayer,
        GENERIC_MOCK_STRUCTURAL_EXPECTATIONS,
      ),
    ).toThrow(/structural readiness/i);
  });

  it("emits progress transitions through the orchestration callback", async () => {
    const onProgress = vi.fn();
    await runLongInputCapture({
      input: {
        rawInputText: platformNotes,
        briefType: PRODUCT_DECISION_BRIEF,
        briefTypeGuidance: PRODUCT_DECISION_BRIEF.guidance,
        captureLayerFields: [],
        sourceLabel: demoExampleSourceLabel("platform-rearchitecture-review"),
      },
      capability: mockLongInputCaptureCapability,
      onProgress,
    });

    expect(onProgress.mock.calls.map(([state]) => state.phase)).toEqual([
      "preparing",
      "processing_chunk",
      "processing_chunk",
      "processing_chunk",
      "processing_chunk",
      "processing_chunk",
      "merging",
      "validating",
    ]);
  });
});
