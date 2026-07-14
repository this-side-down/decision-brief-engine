export const WEBGPU_DECISION_BRIEF_PROMPT_MODE_ENV =
  "VITE_WEBGPU_DECISION_BRIEF_PROMPT_MODE";

export type WebGpuDecisionBriefPromptMode =
  | "structured_response"
  | "markdown_only";

function readPromptModeEnv(): string | undefined {
  const viteEnv = import.meta.env as ImportMetaEnv | undefined;
  const viteValue = viteEnv?.[WEBGPU_DECISION_BRIEF_PROMPT_MODE_ENV];
  if (typeof viteValue === "string" && viteValue.length > 0) {
    return viteValue;
  }

  const nodeProcess = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  const nodeValue = nodeProcess?.env?.[WEBGPU_DECISION_BRIEF_PROMPT_MODE_ENV];
  return typeof nodeValue === "string" && nodeValue.length > 0
    ? nodeValue
    : undefined;
}

export function resolveWebGpuDecisionBriefPromptMode(
  raw: string | undefined = readPromptModeEnv(),
): WebGpuDecisionBriefPromptMode {
  return raw === "markdown_only" ? "markdown_only" : "structured_response";
}

export function isWebGpuMarkdownOnlyExperimentEnabled(): boolean {
  return resolveWebGpuDecisionBriefPromptMode() === "markdown_only";
}
