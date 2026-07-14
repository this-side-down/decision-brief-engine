import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
import { CAPTURE_LAYER_FIELDS, DECISION_BRIEF_MARKDOWN_STRUCTURE } from "./types";
import {
  FORBIDDEN_WEBGPU_PROMPT_PLACEHOLDER_STRINGS,
} from "./decisionBriefPlaceholderDetection";
import { createW3PlaceholderLeakedBriefResult } from "./fixtures/w3PlaceholderLeakedBriefResult";
import {
  GenerationCancelledError,
  GenerationQualityError,
  InputTooLargeError,
} from "./webGpuErrors";
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
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: { role: "assistant", content },
              },
            ],
            usage: {
              prompt_tokens: 100 + attempt,
              completion_tokens: 50 * attempt,
              total_tokens: 150 * attempt,
              extra: {
                e2e_latency_s: 1,
                prefill_tokens_per_s: 1,
                decode_tokens_per_s: 1,
                time_to_first_token_s: 0.1,
                time_per_output_token_s: 0.01,
              },
            },
            model: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
            id: "chatcmpl-test",
            object: "chat.completion",
            created: 0,
          };
        }),
      },
    },
    interruptGenerate: vi.fn(async () => undefined),
  } as unknown as MLCEngineInterface;
}

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/examples/q4-workforce-allocation",
);

const Q4_BRIEF_MARKDOWN = readFileSync(
  join(fixtureRoot, "expected-decision-brief.md"),
  "utf-8",
);

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
  markdownStructure: [...DECISION_BRIEF_MARKDOWN_STRUCTURE],
};

const VALID_BRIEF_ENVELOPE = {
  markdown: Q4_BRIEF_MARKDOWN,
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

  it("uses structured-response prompt without forbidden placeholders", async () => {
    const engine = createMockEngine(async (request) => {
      const prompt = request.messages?.[0]?.content ?? "";
      for (const forbidden of FORBIDDEN_WEBGPU_PROMPT_PLACEHOLDER_STRINGS) {
        expect(String(prompt)).not.toContain(forbidden);
      }
      return JSON.stringify(VALID_BRIEF_ENVELOPE);
    });

    const adapter = createWebGpuModelAdapter({ engine });
    await adapter.generateDecisionBrief(BRIEF_INPUT);
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

  it("retries Decision Brief generation with the same schema constraint on parse failure", async () => {
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

  it("returns clean first attempt without retry", async () => {
    const onBriefRetry = vi.fn();
    const onBriefFirstAttempt = vi.fn();
    const onCompletionDiagnostics = vi.fn();
    const engine = createMockEngine(async () => JSON.stringify(VALID_BRIEF_ENVELOPE));

    const adapter = createWebGpuModelAdapter({
      engine,
      onBriefRetry,
      onBriefFirstAttempt,
      onCompletionDiagnostics,
    });

    await adapter.generateDecisionBrief(BRIEF_INPUT);

    expect(onBriefFirstAttempt).toHaveBeenCalledWith({
      parsePass: true,
      semanticQualityPass: true,
      placeholderLeakageDetected: false,
      retryReasonCategories: [],
      completionDiagnostics: expect.objectContaining({
        generationStage: "brief",
        attemptNumber: 1,
        promptTokens: 101,
        completionTokens: 50,
      }),
      semanticFindings: expect.objectContaining({
        missingRequiredSections: [],
      }),
    });
    expect(onCompletionDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ generationStage: "brief", attemptNumber: 1 }),
    );
    expect(onBriefRetry).not.toHaveBeenCalled();
    expect(engine.chat.completions.create).toHaveBeenCalledTimes(1);
  });

  it("triggers exactly one retry when the first attempt contains placeholders", async () => {
    const onBriefRetry = vi.fn();
    const onBriefFirstAttempt = vi.fn();
    const engine = createMockEngine(async (_request, attempt) => {
      if (attempt === 1) {
        return JSON.stringify(createW3PlaceholderLeakedBriefResult());
      }

      return JSON.stringify(VALID_BRIEF_ENVELOPE);
    });

    const adapter = createWebGpuModelAdapter({
      engine,
      onBriefRetry,
      onBriefFirstAttempt,
    });

    const result = await adapter.generateDecisionBrief(BRIEF_INPUT);

    expect(result.markdown).toContain("Assign Marcus");
    expect(onBriefFirstAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        parsePass: true,
        semanticQualityPass: false,
        placeholderLeakageDetected: true,
      }),
    );
    expect(onBriefRetry).toHaveBeenCalledTimes(1);
    expect(engine.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it("returns a successful grounded retry", async () => {
    const engine = createMockEngine(async (_request, attempt) => {
      if (attempt === 1) {
        return JSON.stringify(createW3PlaceholderLeakedBriefResult());
      }

      return JSON.stringify(VALID_BRIEF_ENVELOPE);
    });

    const adapter = createWebGpuModelAdapter({ engine });
    const result = await adapter.generateDecisionBrief(BRIEF_INPUT);

    expect(result.decisionTrace.entries.length).toBeGreaterThan(1);
  });

  it("records retry attempt diagnostics separately from first attempt", async () => {
    const onCompletionDiagnostics = vi.fn();
    const engine = createMockEngine(async (_request, attempt) => {
      if (attempt === 1) {
        return JSON.stringify(createW3PlaceholderLeakedBriefResult());
      }

      return JSON.stringify(VALID_BRIEF_ENVELOPE);
    });

    const adapter = createWebGpuModelAdapter({
      engine,
      onCompletionDiagnostics,
    });

    await adapter.generateDecisionBrief(BRIEF_INPUT);

    expect(onCompletionDiagnostics).toHaveBeenCalledTimes(2);
    expect(onCompletionDiagnostics.mock.calls[0][0]).toMatchObject({
      generationStage: "brief",
      attemptNumber: 1,
    });
    expect(onCompletionDiagnostics.mock.calls[1][0]).toMatchObject({
      generationStage: "brief_retry",
      attemptNumber: 2,
    });
  });

  it("throws a typed quality error when the retry also fails", async () => {
    const engine = createMockEngine(async () =>
      JSON.stringify(createW3PlaceholderLeakedBriefResult()),
    );

    const adapter = createWebGpuModelAdapter({ engine });

    await expect(adapter.generateDecisionBrief(BRIEF_INPUT)).rejects.toMatchObject({
      name: "GenerationQualityError",
      message: expect.stringMatching(/incomplete Decision Brief/i),
    });
    expect(engine.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it("uses quality retry prompt without forbidden placeholders", async () => {
    const prompts: string[] = [];
    const engine = createMockEngine(async (request, attempt) => {
      prompts.push(String(request.messages?.[0]?.content ?? ""));

      if (attempt === 1) {
        return JSON.stringify(createW3PlaceholderLeakedBriefResult());
      }

      return JSON.stringify(VALID_BRIEF_ENVELOPE);
    });

    const adapter = createWebGpuModelAdapter({ engine });
    await adapter.generateDecisionBrief(BRIEF_INPUT);

    expect(prompts).toHaveLength(2);
    for (const forbidden of FORBIDDEN_WEBGPU_PROMPT_PLACEHOLDER_STRINGS) {
      expect(prompts[1]).not.toContain(forbidden);
    }
    expect(prompts[1]).toContain("Regenerate the complete result");
  });

  it("fails visibly when the Capture Layer retry response is still invalid", async () => {
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

  it("rejects oversized Capture Layer input before calling WebLLM", async () => {
    const engine = createMockEngine(async () => JSON.stringify(q4CaptureLayer));
    const adapter = createWebGpuModelAdapter({ engine });

    await expect(
      adapter.generateCaptureLayer({
        ...CAPTURE_INPUT,
        rawInputText: "Long transcript.\n".repeat(2500),
      }),
    ).rejects.toBeInstanceOf(InputTooLargeError);

    expect(engine.chat.completions.create).not.toHaveBeenCalled();
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
