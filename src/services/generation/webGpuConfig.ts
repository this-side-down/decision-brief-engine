export const DEFAULT_WEBGPU_MODEL_ID =
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export const WEBGPU_MODEL_DOWNLOAD_SIZE_COPY = "~1.0 to 1.2 GB";

export type WebGpuConfig = {
  modelId: string;
  timeoutMs: number;
};

export function getWebGpuConfig(): WebGpuConfig {
  const modelId =
    import.meta.env.VITE_WEBGPU_MODEL_ID ?? DEFAULT_WEBGPU_MODEL_ID;
  const timeoutMs = Number(import.meta.env.VITE_WEBGPU_TIMEOUT_MS ?? "120000");

  return { modelId, timeoutMs };
}
