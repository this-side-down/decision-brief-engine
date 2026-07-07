export type OllamaGenerateResponse = {
  response?: string;
  thinking?: string;
  done?: boolean;
};

/**
 * Returns model output text from an Ollama /api/generate response.
 * Prefers `response`; falls back to `thinking` when `response` is empty.
 * The `thinking` field is never returned to callers when `response` is non-empty.
 */
export function extractOllamaModelText(
  ollamaResponse: OllamaGenerateResponse,
): string {
  const primary = ollamaResponse.response?.trim() ?? "";

  if (primary.length > 0) {
    return primary;
  }

  const thinking = ollamaResponse.thinking?.trim() ?? "";

  if (thinking.length > 0) {
    return thinking;
  }

  throw new Error("Ollama returned empty response and thinking fields.");
}
