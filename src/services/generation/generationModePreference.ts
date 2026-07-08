import type { UserGenerationModePreference } from "./generationMode";

export const GENERATION_MODE_PREFERENCE_KEY = "dbe.generationModePreference";

export function getGenerationModePreference(): UserGenerationModePreference {
  if (typeof window === "undefined") {
    return "mock";
  }

  const stored = window.localStorage.getItem(GENERATION_MODE_PREFERENCE_KEY);

  return stored === "webgpu" ? "webgpu" : "mock";
}

export function setGenerationModePreference(
  preference: UserGenerationModePreference,
): void {
  window.localStorage.setItem(GENERATION_MODE_PREFERENCE_KEY, preference);
}

export function clearGenerationModePreference(): void {
  window.localStorage.removeItem(GENERATION_MODE_PREFERENCE_KEY);
}
