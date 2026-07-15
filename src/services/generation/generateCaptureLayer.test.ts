import { describe, expect, it, vi } from "vitest";
import fixture from "../../../fixtures/examples/q4-workforce-allocation/expected-capture-layer.json";
import { BRIEF_TYPES } from "../../data/briefTypes";
import type { CaptureLayer } from "../../types/captureLayer";
import type { ModelAdapter } from "./types";
import {
  CaptureLayerNextStepQualityError,
  generateCaptureLayerForSession,
} from "./generateCaptureLayer";

const valid = fixture as CaptureLayer;
const genericStep = "Revisit workforce allocation at next meeting with updated context";
const invalid = { ...valid, suggested_next_steps: [...valid.suggested_next_steps.slice(0, 2), genericStep] };

function adapterFor(captures: CaptureLayer[]): ModelAdapter {
  return {
    generateCaptureLayer: vi.fn(async () => captures.shift()!),
    generateDecisionBrief: vi.fn(),
  };
}

const input = {
  rawInputText: "Short Q4 workforce notes",
  briefType: BRIEF_TYPES[0],
  mode: "mock" as const,
};

describe("Capture Layer next-step quality orchestration", () => {
  it("retries one invalid item, preserves valid order, and accepts the correction", async () => {
    const adapter = adapterFor([invalid, valid]);
    const result = await generateCaptureLayerForSession({ ...input, adapter });
    expect(result.suggested_next_steps).toEqual(valid.suggested_next_steps);
    expect(adapter.generateCaptureLayer).toHaveBeenCalledTimes(2);
    expect(vi.mocked(adapter.generateCaptureLayer).mock.calls[1][0].captureQualityRetryFeedback).toEqual([genericStep]);
  });

  it("returns a typed terminal failure with diagnostics after the second invalid attempt", async () => {
    const adapter = adapterFor([invalid, invalid]);
    const diagnostics = { value: null };
    await expect(generateCaptureLayerForSession({ ...input, adapter, qualityDiagnostics: diagnostics }))
      .rejects.toMatchObject({
        name: "CaptureLayerNextStepQualityError",
        unsupportedNextSteps: [genericStep],
      });
    expect(diagnostics.value).toMatchObject({
      attemptCount: 2,
      retryCategory: "unsupported_next_steps",
      attempts: [
        { attemptNumber: 1, unsupportedNextSteps: [genericStep] },
        { attemptNumber: 2, unsupportedNextSteps: [genericStep] },
      ],
    });
  });

  it("does not invoke Stage A after terminal Capture quality failure", async () => {
    const adapter = adapterFor([invalid, invalid]);
    await expect(generateCaptureLayerForSession({ ...input, adapter })).rejects.toBeInstanceOf(CaptureLayerNextStepQualityError);
    expect(adapter.generateDecisionBrief).not.toHaveBeenCalled();
  });

  it("does not retry cancellation or supersession", async () => {
    const cancelled = new AbortController();
    cancelled.abort();
    const cancelAdapter = adapterFor([invalid, valid]);
    await expect(generateCaptureLayerForSession({ ...input, adapter: cancelAdapter, signal: cancelled.signal })).rejects.toThrow(/cancel/i);
    expect(cancelAdapter.generateCaptureLayer).not.toHaveBeenCalled();

    const supersededAdapter = adapterFor([invalid, valid]);
    await expect(generateCaptureLayerForSession({ ...input, adapter: supersededAdapter, runId: 1, activeRunId: 2 })).rejects.toThrow(/superseded/i);
    expect(supersededAdapter.generateCaptureLayer).not.toHaveBeenCalled();
  });

  it.each(["Ollama request timed out after 100ms.", "fetch failed"])(
    "does not retry infrastructure failure: %s",
    async (message) => {
      const adapter = adapterFor([]);
      vi.mocked(adapter.generateCaptureLayer).mockRejectedValue(new Error(message));
      await expect(generateCaptureLayerForSession({ ...input, adapter })).rejects.toThrow(message);
      expect(adapter.generateCaptureLayer).toHaveBeenCalledTimes(1);
    },
  );
});
