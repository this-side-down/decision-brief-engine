export type GenerationMode = "mock" | "ollama";

export function getGenerationMode(): GenerationMode {
  return import.meta.env.VITE_GENERATION_MODE === "ollama" ? "ollama" : "mock";
}

export function getGenerationModeLabel(): string {
  return getGenerationMode() === "ollama"
    ? "Local Ollama inference"
    : "Mocked local generation for workflow validation";
}

export function getGenerationModeBadge(): string {
  return getGenerationMode() === "ollama" ? "Ollama" : "Demo";
}
