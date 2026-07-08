export type OllamaConfig = {
  baseUrl: string;
  model: string;
  timeoutMs: number;
};

type OllamaEnvName =
  | "VITE_OLLAMA_BASE_URL"
  | "VITE_OLLAMA_MODEL"
  | "VITE_OLLAMA_TIMEOUT_MS";

function readNodeEnv(name: OllamaEnvName): string | undefined {
  const nodeProcess = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  const value = nodeProcess?.env?.[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isNodeRuntime(): boolean {
  const nodeProcess = (
    globalThis as {
      process?: { versions?: { node?: string } };
    }
  ).process;

  return typeof nodeProcess?.versions?.node === "string";
}

function readEnv(name: OllamaEnvName): string | undefined {
  const viteEnv = import.meta.env as ImportMetaEnv | undefined;
  const viteValue = viteEnv?.[name];
  if (typeof viteValue === "string" && viteValue.length > 0) {
    return viteValue;
  }

  return readNodeEnv(name);
}

function defaultOllamaBaseUrl(): string {
  // Browser / Vite preview uses the Vite `/ollama` proxy.
  // Node CLI eval runs outside Vite, so call Ollama directly.
  return isNodeRuntime() ? "http://127.0.0.1:11434" : "/ollama";
}

export function getOllamaConfig(): OllamaConfig {
  const baseUrl = readEnv("VITE_OLLAMA_BASE_URL") ?? defaultOllamaBaseUrl();
  const model = readEnv("VITE_OLLAMA_MODEL") ?? "qwen3:4b";
  const timeoutMs = Number(readEnv("VITE_OLLAMA_TIMEOUT_MS") ?? "120000");

  return { baseUrl, model, timeoutMs };
}
