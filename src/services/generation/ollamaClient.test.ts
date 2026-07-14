import { afterEach, describe, expect, it, vi } from "vitest";
import { CHUNK_EXTRACTION_JSON_SCHEMA } from "./longInput/chunkExtractionSchema";
import { GenerationCancelledError } from "./webGpuErrors";

const originalFetch = globalThis.fetch;

function captureFetchBody(responseText = '{"ok":true}') {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    return new Response(JSON.stringify({ response: responseText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  return fetchMock;
}

function readRequestBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

describe("ollamaGenerate", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("omits think and temperature from default ordinary requests", async () => {
    const fetchMock = captureFetchBody();
    globalThis.fetch = fetchMock as typeof fetch;

    const { ollamaGenerate } = await import("./ollamaClient");
    await ollamaGenerate({ prompt: "ordinary capture prompt" });

    const body = readRequestBody(fetchMock);
    expect(body).not.toHaveProperty("think");
    expect(body).not.toHaveProperty("options");
  });

  it("supports format json without think or temperature", async () => {
    const fetchMock = captureFetchBody('{"markdown":"# Decision Brief"}');
    globalThis.fetch = fetchMock as typeof fetch;

    const { ollamaGenerate } = await import("./ollamaClient");
    await ollamaGenerate({ prompt: "brief prompt", format: "json" });

    const body = readRequestBody(fetchMock);
    expect(body.format).toBe("json");
    expect(body).not.toHaveProperty("think");
    expect(body).not.toHaveProperty("options");
  });

  it("sends schema format, think false, and temperature 0 for chunk extraction settings", async () => {
    const fetchMock = captureFetchBody("{}");
    globalThis.fetch = fetchMock as typeof fetch;

    const { ollamaGenerate } = await import("./ollamaClient");
    await ollamaGenerate({
      prompt: "chunk prompt",
      format: CHUNK_EXTRACTION_JSON_SCHEMA,
      think: false,
      temperature: 0,
    });

    const body = readRequestBody(fetchMock);
    expect(body.format).toEqual(CHUNK_EXTRACTION_JSON_SCHEMA);
    expect(body.think).toBe(false);
    expect(body.options).toEqual({ temperature: 0 });
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
