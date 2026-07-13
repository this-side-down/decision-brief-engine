import type { ChatCompletionRequest, MLCEngineInterface } from "@mlc-ai/web-llm";
import { describe, expect, it, vi } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import q4CaptureLayer from "../../../fixtures/examples/q4-workforce-allocation/expected-capture-layer.json";
import q4DecisionTrace from "../../../fixtures/examples/q4-workforce-allocation/expected-decision-trace.json";
import { mockModelAdapter } from "./mockModelAdapter";
import { ollamaModelAdapter } from "./ollamaModelAdapter";
import { getModelAdapter } from "./getModelAdapter";
import { parseCaptureLayerJson } from "./parseCaptureLayer";
import { parseDecisionBriefResultJson } from "./parseDecisionBriefResult";
import { CAPTURE_LAYER_FIELDS } from "./types";
import { GenerationCancelledError } from "./webGpuErrors";
import {
  CAPTURE_LAYER_RESPONSE_SCHEMA_JSON,
  DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON,
} from "./webGpuGenerationSchemas";
import { createWebGpuModelAdapter } from "./webGpuModelAdapter";

type MockCreateHandler = (
  request: ChatCompletionRequest,
  attempt: number,
) => Promise<string> | string;

function createMockEngine(handler: MockCreateHandler): MLCEngineInterface {
  let attempt = 0;

  return {
    chat: {
      completions: {
        create: vi.fn(async (request: ChatCompletionRequest) => {
          attempt += 1;
          const content = await handler(request, attempt);
          return {
            choices: [{ message: { content } }],
          };
        }),
      },
    },
    interruptGenerate: vi.fn(async () => undefined),
  } as unknown as MLCEngineInterface;
}

const CAPTURE_INPUT = {
  rawInputText: "Workforce allocation notes for hospital and school projects.",
  briefType: STRATEGY_DECISION_BRIEF,
  briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
  captureLayerFields: [...CAPTURE_LAYER_FIELDS],
};

const BRIEF_INPUT = {
  captureLayer: q4CaptureLayer,
  briefType: STRATEGY_DECISION_BRIEF,
  briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
  markdownStructure: ["Summary", "Recommendation"],
};

const VALID_BRIEF_ENVELOPE = {
  markdown: "# Decision Brief\n\nRecommendation text.",
  decisionTrace: q4DecisionTrace,
};

describe("createWebGpuModelAdapter", () => {
  it("requests schema-constrained Capture Layer output", async () => {
    const engine = createMockEngine(async (request) => {
      expect(request.response_format).toEqual({
        type: "json_object",
        schema: CAPTURE_LAYER_RESPONSE_SCHEMA_JSON,
      });
      return JSON.stringify(q4CaptureLayer);
    });

    const adapter = createWebGpuModelAdapter({ engine });
    const captureLayer = await adapter.generateCaptureLayer(CAPTURE_INPUT);

    expect(captureLayer.stated_decision).toBe(q4CaptureLayer.stated_decision);
    expect(engine.chat.completions.create).toHaveBeenCalledTimes(1);
  });

  it("requests schema-constrained Decision Brief result output", async () => {
    const engine = createMockEngine(async (request) => {
      expect(request.response_format).toEqual({
        type: "json_object",
        schema: DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON,
      });
      return JSON.stringify(VALID_BRIEF_ENVELOPE);
    });

    const adapter = createWebGpuModelAdapter({ engine });
    const result = await adapter.generateDecisionBrief(BRIEF_INPUT);

    expect(result.markdown).toContain("# Decision Brief");
    expect(result.decisionTrace.entries.length).toBeGreaterThan(0);
    expect(engine.chat.completions.create).toHaveBeenCalledTimes(1);
  });

  it("parses valid constrained Capture Layer responses with existing parser", async () => {
    const engine = createMockEngine(async () => JSON.stringify(q4CaptureLayer));
    const adapter = createWebGpuModelAdapter({ engine });
    const captureLayer = await adapter.generateCaptureLayer(CAPTURE_INPUT);

    expect(parseCaptureLayerJson(JSON.stringify(captureLayer))).toEqual(captureLayer);
  });

  it("parses valid constrained Decision Brief envelope with existing parser", async () => {
    const engine = createMockEngine(async () => JSON.stringify(VALID_BRIEF_ENVELOPE));
    const adapter = createWebGpuModelAdapter({ engine });
    const result = await adapter.generateDecisionBrief(BRIEF_INPUT);

    expect(parseDecisionBriefResultJson(JSON.stringify(result))).toEqual(result);
  });

  it("retries at most once and reuses the same Capture Layer schema", async () => {
    const onCaptureRetry = vi.fn();
    const onCaptureFirstAttempt = vi.fn();
    const engine = createMockEngine(async (request, attempt) => {
      expect(request.response_format?.schema).toBe(CAPTURE_LAYER_RESPONSE_SCHEMA_JSON);

      if (attempt === 1) {
        return "{ invalid json";
      }

      return JSON.stringify(q4CaptureLayer);
    });

    const adapter = createWebGpuModelAdapter({
      engine,
      onCaptureRetry,
      onCaptureFirstAttempt,
    });

    await adapter.generateCaptureLayer(CAPTURE_INPUT);

    expect(onCaptureFirstAttempt).toHaveBeenCalledWith({ parsePass: false });
    expect(onCaptureRetry).toHaveBeenCalledTimes(1);
    expect(engine.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it("retries Decision Brief generation with the same schema constraint", async () => {
    const onBriefRetry = vi.fn();
    const engine = createMockEngine(async (request, attempt) => {
      expect(request.response_format?.schema).toBe(
        DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON,
      );

      if (attempt === 1) {
        return '{"markdown":""}';
      }

      return JSON.stringify(VALID_BRIEF_ENVELOPE);
    });

    const adapter = createWebGpuModelAdapter({ engine, onBriefRetry });
    await adapter.generateDecisionBrief(BRIEF_INPUT);

    expect(onBriefRetry).toHaveBeenCalledTimes(1);
    expect(engine.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it("fails visibly when the retry response is still invalid", async () => {
    const engine = createMockEngine(async () => "{ still invalid");

    const adapter = createWebGpuModelAdapter({ engine });

    await expect(adapter.generateCaptureLayer(CAPTURE_INPUT)).rejects.toThrow(
      /valid JSON|missing required field/i,
    );
    expect(engine.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it("records first-attempt schema pass without retrying", async () => {
    const onCaptureFirstAttempt = vi.fn();
    const onCaptureRetry = vi.fn();
    const engine = createMockEngine(async () => JSON.stringify(q4CaptureLayer));

    const adapter = createWebGpuModelAdapter({
      engine,
      onCaptureFirstAttempt,
      onCaptureRetry,
    });

    await adapter.generateCaptureLayer(CAPTURE_INPUT);

    expect(onCaptureFirstAttempt).toHaveBeenCalledWith({ parsePass: true });
    expect(onCaptureRetry).not.toHaveBeenCalled();
  });

  it("preserves cancellation behavior", async () => {
    const controller = new AbortController();
    controller.abort();

    const engine = createMockEngine(async () => JSON.stringify(q4CaptureLayer));
    const adapter = createWebGpuModelAdapter({
      engine,
      signal: controller.signal,
    });

    await expect(adapter.generateCaptureLayer(CAPTURE_INPUT)).rejects.toBeInstanceOf(
      GenerationCancelledError,
    );
    expect(engine.chat.completions.create).not.toHaveBeenCalled();
  });

  it("cancels in-flight generation when the abort signal fires", async () => {
    const controller = new AbortController();
    const engine = createMockEngine(async () => {
      controller.abort();
      return JSON.stringify(q4CaptureLayer);
    });

    const adapter = createWebGpuModelAdapter({
      engine,
      signal: controller.signal,
    });

    await expect(adapter.generateCaptureLayer(CAPTURE_INPUT)).rejects.toBeInstanceOf(
      GenerationCancelledError,
    );
    expect(engine.interruptGenerate).toHaveBeenCalled();
  });
});

describe("non-WebGPU adapters remain unchanged", () => {
  it("returns mock adapter without WebGPU engine requirements", () => {
    const adapter = getModelAdapter({ mode: "mock" });
    expect(adapter).toBe(mockModelAdapter);
  });

  it("returns ollama adapter without WebGPU engine requirements", () => {
    const adapter = getModelAdapter({ mode: "ollama" });
    expect(adapter).toBe(ollamaModelAdapter);
  });

  it("still rejects missing Capture Layer input in WebGPU adapter", async () => {
    const engine = createMockEngine(async () => JSON.stringify(q4CaptureLayer));
    const adapter = createWebGpuModelAdapter({ engine });

    await expect(
      adapter.generateCaptureLayer({
        ...CAPTURE_INPUT,
        rawInputText: "   ",
      }),
    ).rejects.toThrow(/Raw input is required/);
    expect(engine.chat.completions.create).not.toHaveBeenCalled();
  });
});
