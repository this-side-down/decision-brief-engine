import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadWebGpuEngine,
  resetWebGpuEngineStateForTests,
} from "./webGpuEngine";
import {
  ModelLoadCancelledError,
  ModelLoadTimeoutError,
} from "./webGpuErrors";

const reloadMock = vi.fn<() => Promise<void>>();
const unloadMock = vi.fn<() => Promise<void>>();

vi.mock("@mlc-ai/web-llm", () => ({
  MLCEngine: class {
    reload = reloadMock;
    unload = unloadMock;
  },
  hasModelInCache: vi.fn(async () => false),
}));

vi.mock("./webGpuConfig", () => ({
  getWebGpuConfig: () => ({
    modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    timeoutMs: 50,
  }),
}));

describe("webGpuEngine model load timeout", () => {
  beforeEach(() => {
    vi.stubGlobal("window", globalThis);
    resetWebGpuEngineStateForTests();
    reloadMock.mockReset();
    unloadMock.mockReset();
    unloadMock.mockResolvedValue(undefined);
    reloadMock.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("preserves ModelLoadTimeoutError when timeout cleanup unloads the engine", async () => {
    const loadPromise = loadWebGpuEngine();
    const expectation = expect(loadPromise).rejects.toBeInstanceOf(
      ModelLoadTimeoutError,
    );

    await vi.advanceTimersByTimeAsync(50);
    await expectation;
  });

  it("still reports explicit cancellation for user abort", async () => {
    reloadMock.mockResolvedValue(undefined);
    const controller = new AbortController();
    const loadPromise = loadWebGpuEngine({ signal: controller.signal });

    controller.abort();
    await expect(loadPromise).rejects.toBeInstanceOf(ModelLoadCancelledError);
  });
});
