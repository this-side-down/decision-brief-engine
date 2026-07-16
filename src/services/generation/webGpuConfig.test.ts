import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_WEBGPU_MODEL_ID,
  getWebGpuConfig,
  getWebGpuModelDownloadSizeCopy,
  isWebGpuSplitStageEnabled,
} from "./webGpuConfig";

describe("webGpuConfig", () => {
  afterEach(() => {
    delete process.env.VITE_WEBGPU_MODEL_ID;
    delete process.env.VITE_WEBGPU_TIMEOUT_MS;
    delete process.env.VITE_WEBGPU_SPLIT_STAGE;
  });

  it("falls back to the default model ID when Vite env is unavailable", () => {
    expect(getWebGpuConfig().modelId).toBe(DEFAULT_WEBGPU_MODEL_ID);
  });

  it("reads VITE_WEBGPU_MODEL_ID from process.env in Node", () => {
    process.env.VITE_WEBGPU_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
    expect(getWebGpuConfig().modelId).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
  });

  it("exposes candidate-specific download copy without changing the default", () => {
    process.env.VITE_WEBGPU_MODEL_ID = "Qwen3.5-4B-q4f16_1-MLC";
    expect(getWebGpuModelDownloadSizeCopy()).toBe("~2.2 GB");
    expect(DEFAULT_WEBGPU_MODEL_ID).toBe(
      "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    );
  });

  it("keeps split-stage browser generation explicitly opt-in", () => {
    expect(isWebGpuSplitStageEnabled()).toBe(false);
    process.env.VITE_WEBGPU_SPLIT_STAGE = "true";
    expect(isWebGpuSplitStageEnabled()).toBe(true);
  });
});
