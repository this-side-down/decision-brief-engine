import { getGenerationMode } from "./generationMode";
import { mockModelAdapter } from "./mockModelAdapter";
import { ollamaModelAdapter } from "./ollamaModelAdapter";
import type { ModelAdapter } from "./types";

export function getModelAdapter(): ModelAdapter {
  return getGenerationMode() === "ollama" ? ollamaModelAdapter : mockModelAdapter;
}
