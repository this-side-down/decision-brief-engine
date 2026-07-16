export const WEB_LLM_INSTALLED_VERSION = "0.2.84";

export type WebGpuCandidateRecord = {
  modelId: string;
  modelWeights: string;
  modelLibrary: string;
  approximateDownloadBytes: number;
  estimatedVramMb: number;
  structuredJsonResponse: true;
  disableThinking: true;
};

/**
 * Candidate records verified against @mlc-ai/web-llm 0.2.84's
 * prebuiltAppConfig. Download sizes are the summed files exposed by each
 * referenced MLC Hugging Face repository on 2026-07-15.
 */
export const WEBGPU_CANDIDATE_RECORDS = [
  {
    modelId: "Qwen3.5-4B-q4f16_1-MLC",
    modelWeights: "https://huggingface.co/mlc-ai/Qwen3.5-4B-q4f16_1-MLC",
    modelLibrary:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen3.5-4B-q4f16_1_cs1k-webgpu.wasm",
    approximateDownloadBytes: 2_390_497_405,
    estimatedVramMb: 3_867.82,
    structuredJsonResponse: true,
    disableThinking: true,
  },
  {
    modelId: "Qwen3-4B-q4f16_1-MLC",
    modelWeights: "https://huggingface.co/mlc-ai/Qwen3-4B-q4f16_1-MLC",
    modelLibrary:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen3-4B-q4f16_1_cs1k-webgpu.wasm",
    approximateDownloadBytes: 2_279_167_154,
    estimatedVramMb: 3_431.59,
    structuredJsonResponse: true,
    disableThinking: true,
  },
  {
    modelId: "Qwen3.5-2B-q4f16_1-MLC",
    modelWeights: "https://huggingface.co/mlc-ai/Qwen3.5-2B-q4f16_1-MLC",
    modelLibrary:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen3.5-2B-q4f16_1_cs1k-webgpu.wasm",
    approximateDownloadBytes: 1_082_564_401,
    estimatedVramMb: 2_245.44,
    structuredJsonResponse: true,
    disableThinking: true,
  },
] as const satisfies readonly WebGpuCandidateRecord[];

export const PREFERRED_WEBGPU_CANDIDATE_ID =
  WEBGPU_CANDIDATE_RECORDS[0].modelId;
export const FALLBACK_WEBGPU_CANDIDATE_ID =
  WEBGPU_CANDIDATE_RECORDS[1].modelId;

export function getWebGpuCandidateRecord(
  modelId: string,
): WebGpuCandidateRecord | null {
  return (
    WEBGPU_CANDIDATE_RECORDS.find((record) => record.modelId === modelId) ??
    null
  );
}

export function formatApproximateModelDownloadSize(bytes: number): string {
  const gib = bytes / 1024 ** 3;
  return `~${gib.toFixed(1)} GB`;
}
