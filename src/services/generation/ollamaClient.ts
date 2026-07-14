import { extractOllamaModelText, type OllamaGenerateResponse } from "./extractOllamaText";
import { getOllamaConfig } from "./ollamaConfig";
import { GenerationCancelledError } from "./webGpuErrors";

export type OllamaGenerateFormat = "json" | Record<string, unknown>;

export type OllamaGenerateOptions = {
  prompt: string;
  format?: OllamaGenerateFormat;
  signal?: AbortSignal;
  temperature?: number;
};

function isUserCancellation(
  error: unknown,
  externalSignal?: AbortSignal,
): boolean {
  return (
    error instanceof Error &&
    error.name === "AbortError" &&
    externalSignal?.aborted === true
  );
}

export async function ollamaGenerate(
  options: OllamaGenerateOptions,
): Promise<string> {
  const config = getOllamaConfig();

  if (options.signal?.aborted) {
    throw new GenerationCancelledError();
  }

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), config.timeoutMs);
  const onExternalAbort = () => timeoutController.abort();

  if (options.signal) {
    options.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        prompt: options.prompt,
        stream: false,
        think: false,
        ...(options.format ? { format: options.format } : {}),
        ...(options.temperature !== undefined
          ? { options: { temperature: options.temperature } }
          : {}),
      }),
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed (${response.status}).`);
    }

    const payload = (await response.json()) as OllamaGenerateResponse;

    return extractOllamaModelText(payload);
  } catch (error) {
    if (isUserCancellation(error, options.signal)) {
      throw new GenerationCancelledError();
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama request timed out after ${config.timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    if (options.signal) {
      options.signal.removeEventListener("abort", onExternalAbort);
    }
  }
}
