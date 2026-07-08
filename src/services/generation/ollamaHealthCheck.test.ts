import { afterEach, describe, expect, it } from "vitest";
import { runOllamaHealthCheck } from "./ollamaHealthCheck";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function jsonResponse(payload: unknown, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function createFetchMock(
  handlers: Record<string, () => Promise<MockResponse> | MockResponse>,
): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const handler = Object.entries(handlers).find(([pattern]) =>
      url.includes(pattern),
    );

    if (!handler) {
      throw new TypeError(`Unexpected fetch URL: ${url}`);
    }

    return handler[1]() as Response;
  }) as typeof fetch;
}

describe("runOllamaHealthCheck", () => {
  const previousEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  it("passes when endpoint, model, and smoke test succeed", async () => {
    process.env.VITE_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    process.env.VITE_OLLAMA_MODEL = "qwen3:4b";

    const fetchFn = createFetchMock({
      "/api/version": () => jsonResponse({ version: "0.5.0" }),
      "/api/tags": () =>
        jsonResponse({ models: [{ name: "qwen3:4b" }, { name: "llama3:8b" }] }),
      "/api/generate": () =>
        jsonResponse({ response: "ok", done: true }),
    });

    const result = await runOllamaHealthCheck({ fetchFn });

    expect(result.ready).toBe(true);
    expect(result.checks.map((check) => check.status)).toEqual([
      "pass",
      "pass",
      "pass",
      "pass",
    ]);
  });

  it("fails clearly when the endpoint is unreachable", async () => {
    process.env.VITE_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    process.env.VITE_OLLAMA_MODEL = "qwen3:4b";

    const fetchFn = (async () => {
      const error = new TypeError("fetch failed");
      (error as { cause?: { code?: string } }).cause = { code: "ECONNREFUSED" };
      throw error;
    }) as typeof fetch;

    const result = await runOllamaHealthCheck({ fetchFn });

    expect(result.ready).toBe(false);
    expect(result.checks[1]).toMatchObject({
      id: "endpoint",
      status: "fail",
      summary: "Ollama endpoint is not reachable.",
    });
    expect(result.checks[2].status).toBe("skip");
    expect(result.reason).toMatch(/Start Ollama/i);
  });

  it("fails when the configured model is missing", async () => {
    process.env.VITE_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    process.env.VITE_OLLAMA_MODEL = "qwen3:4b";

    const fetchFn = createFetchMock({
      "/api/version": () => jsonResponse({ version: "0.5.0" }),
      "/api/tags": () => jsonResponse({ models: [{ name: "llama3:8b" }] }),
    });

    const result = await runOllamaHealthCheck({
      fetchFn,
      smokeTest: false,
    });

    expect(result.ready).toBe(false);
    expect(result.checks[2]).toMatchObject({
      id: "model",
      status: "fail",
      summary: 'Configured model "qwen3:4b" is not available.',
      fix: "Pull the model with: ollama pull qwen3:4b",
    });
  });

  it("fails when generation times out", async () => {
    process.env.VITE_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    process.env.VITE_OLLAMA_MODEL = "qwen3:4b";

    const fetchFn = createFetchMock({
      "/api/version": () => jsonResponse({ version: "0.5.0" }),
      "/api/tags": () => jsonResponse({ models: [{ name: "qwen3:4b" }] }),
      "/api/generate": async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      },
    });

    const result = await runOllamaHealthCheck({
      fetchFn,
      smokeTestTimeoutMs: 5,
    });

    expect(result.ready).toBe(false);
    expect(result.checks[3]).toMatchObject({
      id: "smoke_test",
      status: "fail",
      summary: "Ollama generation timed out.",
    });
  });

  it("fails when generation returns empty output", async () => {
    process.env.VITE_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    process.env.VITE_OLLAMA_MODEL = "qwen3:4b";

    const fetchFn = createFetchMock({
      "/api/version": () => jsonResponse({ version: "0.5.0" }),
      "/api/tags": () => jsonResponse({ models: [{ name: "qwen3:4b" }] }),
      "/api/generate": () => jsonResponse({ response: "", thinking: "" }),
    });

    const result = await runOllamaHealthCheck({ fetchFn });

    expect(result.ready).toBe(false);
    expect(result.checks[3]).toMatchObject({
      id: "smoke_test",
      status: "fail",
      summary: "Ollama returned an invalid response.",
    });
  });

  it("fails when env config values are malformed", async () => {
    process.env.VITE_OLLAMA_TIMEOUT_MS = "not-a-number";

    const result = await runOllamaHealthCheck({
      fetchFn: createFetchMock({}),
      smokeTest: false,
    });

    expect(result.ready).toBe(false);
    expect(result.checks[0]).toMatchObject({
      id: "config",
      status: "fail",
      summary: "Ollama configuration is missing or malformed.",
    });
    expect(result.checks[1].status).toBe("skip");
  });
});
