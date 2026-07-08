import {
  getGenerationModePreference,
  setGenerationModePreference,
} from "./generationModePreference";

export type GenerationMode = "mock" | "ollama" | "webgpu";

export type UserGenerationModePreference = "mock" | "webgpu";

export function isOllamaLocked(): boolean {
  return import.meta.env.VITE_GENERATION_MODE === "ollama";
}

export function isWebGpuInferenceEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_WEBGPU_INFERENCE === "true";
}

export function resolveEffectiveMode(
  preference: UserGenerationModePreference = getGenerationModePreference(),
): GenerationMode {
  if (isOllamaLocked()) {
    return "ollama";
  }

  if (preference === "webgpu" && !isWebGpuInferenceEnabled()) {
    return "mock";
  }

  return preference;
}

export function getGenerationMode(): GenerationMode {
  return resolveEffectiveMode();
}

export function getGenerationModeLabel(mode: GenerationMode = getGenerationMode()): string {
  switch (mode) {
    case "ollama":
      return "Local Ollama";
    case "webgpu":
      return "Live in browser";
    default:
      return "Mock demo";
  }
}

export function getGenerationModeBadge(mode: GenerationMode = getGenerationMode()): string {
  switch (mode) {
    case "ollama":
      return "Ollama";
    case "webgpu":
      return "Live";
    default:
      return "Demo";
  }
}

export function getGenerationModeDescription(
  mode: GenerationMode = getGenerationMode(),
): string {
  switch (mode) {
    case "ollama":
      return "Local Ollama inference. Session state stays in memory; model thinking is never shown or stored.";
    case "webgpu":
      return "Live in browser downloads a model to this browser. Notes are processed locally and are not sent to a hosted inference API. Quality may be weaker than Local Ollama.";
    default:
      return "Mock demo uses sample output only. No model download or external model call is made.";
  }
}

export function canSelectBrowserInference(): boolean {
  return !isOllamaLocked() && isWebGpuInferenceEnabled();
}

export { getGenerationModePreference, setGenerationModePreference };
