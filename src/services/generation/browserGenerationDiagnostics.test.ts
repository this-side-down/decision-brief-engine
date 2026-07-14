import { describe, expect, it } from "vitest";
import type { ChatCompletion } from "@mlc-ai/web-llm";
import {
  extractStructuredCompletionDiagnostics,
  formatStructuredCompletionDiagnosticsSummary,
  isBrowserGenerationDiagnosticsEnabled,
} from "./browserGenerationDiagnostics";

function createChatCompletion(
  overrides: Partial<ChatCompletion> = {},
): ChatCompletion {
  return {
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 0,
    model: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        logprobs: null,
        message: {
          role: "assistant",
          content: "{}",
        },
      },
    ],
    usage: {
      prompt_tokens: 512,
      completion_tokens: 128,
      total_tokens: 640,
      extra: {
        e2e_latency_s: 1.2,
        prefill_tokens_per_s: 100,
        decode_tokens_per_s: 50,
        time_to_first_token_s: 0.1,
        time_per_output_token_s: 0.02,
      },
    },
    ...overrides,
  };
}

describe("browserGenerationDiagnostics", () => {
  it("extracts usage and finish reason when provider fields are present", () => {
    const diagnostics = extractStructuredCompletionDiagnostics({
      response: createChatCompletion(),
      generationStage: "brief",
      attemptNumber: 1,
      modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      requestOptions: { max_tokens: 1200 },
    });

    expect(diagnostics.promptTokens).toBe(512);
    expect(diagnostics.completionTokens).toBe(128);
    expect(diagnostics.totalTokens).toBe(640);
    expect(diagnostics.finishReason).toBe("stop");
    expect(diagnostics.configuredMaxTokens).toBe(1200);
    expect(diagnostics.generationStage).toBe("brief");
    expect(diagnostics.attemptNumber).toBe(1);
  });

  it("preserves missing provider usage fields as null", () => {
    const diagnostics = extractStructuredCompletionDiagnostics({
      response: createChatCompletion({
        usage: undefined,
        choices: [
          {
            index: 0,
            finish_reason: "length",
            logprobs: null,
            message: { role: "assistant", content: "{}" },
          },
        ],
      }),
      generationStage: "brief_retry",
      attemptNumber: 2,
      modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    });

    expect(diagnostics.promptTokens).toBeNull();
    expect(diagnostics.completionTokens).toBeNull();
    expect(diagnostics.totalTokens).toBeNull();
    expect(diagnostics.finishReason).toBe("length");
    expect(diagnostics.configuredMaxTokens).toBeNull();
  });

  it("does not fabricate finish reason when choice metadata is missing", () => {
    const diagnostics = extractStructuredCompletionDiagnostics({
      response: createChatCompletion({ choices: [] }),
      generationStage: "capture",
      attemptNumber: 1,
      modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    });

    expect(diagnostics.finishReason).toBeNull();
  });

  it("formats unavailable token counts distinctly from zero", () => {
    const summary = formatStructuredCompletionDiagnosticsSummary({
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      finishReason: null,
      configuredMaxTokens: null,
      modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      webLlmVersion: "0.2.84",
      generationStage: "brief",
      attemptNumber: 1,
    });

    expect(summary).toContain("prompt_tokens=unavailable");
    expect(summary).toContain("completion_tokens=unavailable");
    expect(summary).toContain("finish_reason=unavailable");
    expect(summary).toContain("max_tokens=not set");
  });

  it("is disabled by default", () => {
    delete process.env.VITE_BROWSER_GENERATION_DIAGNOSTICS;
    expect(isBrowserGenerationDiagnosticsEnabled()).toBe(false);
  });
});
