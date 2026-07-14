import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerationCancelledError } from "./webGpuErrors";

const originalFetch = globalThis.fetch;

function mockOllamaResponse(text: string) {
  return vi.fn(async () =>
    new Response(JSON.stringify({ response: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("ollamaGenerate", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("completes successful generation", async () => {
    globalThis.fetch = mockOllamaResponse('{"ok":true}') as typeof fetch;

    const { ollamaGenerate } = await import("./ollamaClient");
    await expect(
      ollamaGenerate({ prompt: "test prompt", format: "json" }),
    ).resolves.toBe('{"ok":true}');
  });

  it("throws GenerationCancelledError when the external signal aborts", async () => {
    const controller = new AbortController();
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((_resolve, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    ) as typeof fetch;

    const { ollamaGenerate } = await import("./ollamaClient");
    const promise = ollamaGenerate({
      prompt: "slow prompt",
      signal: controller.signal,
    });

    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(GenerationCancelledError);
  });

  it("throws GenerationCancelledError when the external signal aborts before fetch starts", async () => {
    const controller = new AbortController();
    controller.abort();

    const { ollamaGenerate } = await import("./ollamaClient");

    await expect(
      ollamaGenerate({
        prompt: "cancelled prompt",
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(GenerationCancelledError);
  });
});
