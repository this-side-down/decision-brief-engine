import { describe, expect, it } from "vitest";
import {
  FALLBACK_WEBGPU_CANDIDATE_ID,
  PREFERRED_WEBGPU_CANDIDATE_ID,
  WEBGPU_CANDIDATE_RECORDS,
  WEB_LLM_INSTALLED_VERSION,
  formatApproximateModelDownloadSize,
  getWebGpuCandidateRecord,
} from "./webGpuCandidates";

describe("WebGPU candidate records", () => {
  it("pins the installed package evidence and preferred candidate order", () => {
    expect(WEB_LLM_INSTALLED_VERSION).toBe("0.2.84");
    expect(WEBGPU_CANDIDATE_RECORDS.map((record) => record.modelId)).toEqual([
      "Qwen3.5-4B-q4f16_1-MLC",
      "Qwen3-4B-q4f16_1-MLC",
      "Qwen3.5-2B-q4f16_1-MLC",
    ]);
    expect(PREFERRED_WEBGPU_CANDIDATE_ID).toBe(
      "Qwen3.5-4B-q4f16_1-MLC",
    );
    expect(FALLBACK_WEBGPU_CANDIDATE_ID).toBe(
      "Qwen3-4B-q4f16_1-MLC",
    );
  });

  it("records weights, library, VRAM, JSON support, and disabled thinking", () => {
    const preferred = getWebGpuCandidateRecord(PREFERRED_WEBGPU_CANDIDATE_ID);

    expect(preferred).toMatchObject({
      estimatedVramMb: 3_867.82,
      structuredJsonResponse: true,
      disableThinking: true,
    });
    expect(preferred?.modelWeights).toContain(
      "/mlc-ai/Qwen3.5-4B-q4f16_1-MLC",
    );
    expect(preferred?.modelLibrary).toContain(
      "/v0_2_84/base/Qwen3.5-4B-q4f16_1_cs1k-webgpu.wasm",
    );
    expect(formatApproximateModelDownloadSize(preferred!.approximateDownloadBytes)).toBe(
      "~2.2 GB",
    );
  });
});
