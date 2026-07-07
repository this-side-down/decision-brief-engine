export type OllamaConfig = {
  baseUrl: string;
  model: string;
  timeoutMs: number;
};

export function getOllamaConfig(): OllamaConfig {
  const baseUrl = import.meta.env.VITE_OLLAMA_BASE_URL ?? "/ollama";
  const model = import.meta.env.VITE_OLLAMA_MODEL ?? "qwen3:4b";
  const timeoutMs = Number(import.meta.env.VITE_OLLAMA_TIMEOUT_MS ?? "120000");

  return { baseUrl, model, timeoutMs };
}
