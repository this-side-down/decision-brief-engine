import { extractOllamaModelText, type OllamaGenerateResponse } from "./extractOllamaText";
import { getOllamaConfig } from "./ollamaConfig";

export type OllamaGenerateOptions = {
  prompt: string;
  format?: "json";
};

export async function ollamaGenerate(
  options: OllamaGenerateOptions,
): Promise<string> {
  const config = getOllamaConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        prompt: options.prompt,
        stream: false,
        ...(options.format ? { format: options.format } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed (${response.status}).`);
    }

    const payload = (await response.json()) as OllamaGenerateResponse;

    return extractOllamaModelText(payload);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama request timed out after ${config.timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
