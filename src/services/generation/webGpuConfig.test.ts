import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_WEBGPU_MODEL_ID,
  getWebGpuConfig,
} from "./webGpuConfig";

describe("webGpuConfig", () => {
  afterEach(() => {
    delete process.env.VITE_WEBGPU_MODEL_ID;
    delete process.env.VITE_WEBGPU_TIMEOUT_MS;
  });

  it("falls back to the default model ID when Vite env is unavailable", () => {
    expect(getWebGpuConfig().modelId).toBe(DEFAULT_WEBGPU_MODEL_ID);
  });

  it("reads VITE_WEBGPU_MODEL_ID from process.env in Node", () => {
    process.env.VITE_WEBGPU_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
    expect(getWebGpuConfig().modelId).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
  });
});
