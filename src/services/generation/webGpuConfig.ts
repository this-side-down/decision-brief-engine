export const DEFAULT_WEBGPU_MODEL_ID =
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export const WEBGPU_MODEL_DOWNLOAD_SIZE_COPY = "~1.0 to 1.2 GB";

export type WebGpuConfig = {
  modelId: string;
  timeoutMs: number;
};

type WebGpuEnvName = "VITE_WEBGPU_MODEL_ID" | "VITE_WEBGPU_TIMEOUT_MS";

function readNodeEnv(name: WebGpuEnvName): string | undefined {
  const nodeProcess = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  const value = nodeProcess?.env?.[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readEnv(name: WebGpuEnvName): string | undefined {
  const viteEnv = import.meta.env as ImportMetaEnv | undefined;
  const viteValue = viteEnv?.[name];
  if (typeof viteValue === "string" && viteValue.length > 0) {
    return viteValue;
  }

  return readNodeEnv(name);
}

export function getWebGpuConfig(): WebGpuConfig {
  const modelId = readEnv("VITE_WEBGPU_MODEL_ID") ?? DEFAULT_WEBGPU_MODEL_ID;
  const timeoutMs = Number(readEnv("VITE_WEBGPU_TIMEOUT_MS") ?? "120000");

  return { modelId, timeoutMs };
}
