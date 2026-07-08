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

export function getWorkflowSetupCopy(mode: GenerationMode = getGenerationMode()): string {
  switch (mode) {
    case "ollama":
      return "Running with Local Ollama. Notes stay on this machine, but generation speed depends on local hardware and model performance.";
    case "webgpu":
      return "Choose a messy example to test the gated browser model path. Notes stay local in this browser, but quality may be weaker than the Mock demo or Local Ollama.";
    default:
      return "Choose a messy example to see how Decision Brief Engine turns raw notes into a Capture Layer and then a structured brief. The public demo uses mocked generation so the workflow is reliable and reviewable.";
  }
}

export function canSelectBrowserInference(): boolean {
  return !isOllamaLocked() && isWebGpuInferenceEnabled();
}

export { getGenerationModePreference, setGenerationModePreference };
