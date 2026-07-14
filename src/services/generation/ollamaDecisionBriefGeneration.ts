import type { DecisionArtifactDiagnostics } from "../../evaluation/pipeline/resultTypes";
import { ollamaGenerate } from "./ollamaClient";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";
import { DECISION_BRIEF_RESULT_JSON_SCHEMA } from "./decisionBriefResultSchema";
import { parseDecisionBriefResultStrict } from "./parseDecisionBriefResultStrict";
import {
  buildDecisionBriefPrompt,
  buildDecisionBriefRetryPrompt,
} from "./prompts";
import type { DecisionBriefResult, GenerateDecisionBriefInput } from "./types";
import { GenerationCancelledError } from "./webGpuErrors";

const MAX_DECISION_BRIEF_RETRIES = 1;

export const ollamaDecisionArtifactDiagnosticsHolder: {
  value: DecisionArtifactDiagnostics | null;
} = { value: null };

async function requestCombinedDecisionBrief(
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  return ollamaGenerate({
    prompt,
    format: DECISION_BRIEF_RESULT_JSON_SCHEMA,
    temperature: 0,
    think: false,
    signal,
  });
}

export async function generateOllamaDecisionBrief(
  input: GenerateDecisionBriefInput,
  options: { signal?: AbortSignal } = {},
): Promise<DecisionBriefResult> {
  const started = Date.now();
  let retryCount = 0;
  let lastError = "Decision Brief generation failed.";

  ollamaDecisionArtifactDiagnosticsHolder.value = null;

  for (let attempt = 0; attempt <= MAX_DECISION_BRIEF_RETRIES; attempt += 1) {
    const prompt =
      attempt === 0
        ? buildDecisionBriefPrompt(input, { mode: "structured_response" })
        : buildDecisionBriefRetryPrompt(input, lastError);

    try {
      const rawText = await requestCombinedDecisionBrief(prompt, options.signal);
      const result = parseDecisionBriefResultStrict(rawText);

      ollamaDecisionArtifactDiagnosticsHolder.value = {
        strategy: "combined",
        briefRetryCount: retryCount,
        traceRetryCount: null,
        briefGenerationLatencyMs: Date.now() - started,
        traceGenerationLatencyMs: null,
      };

      return result;
    } catch (error) {
      if (error instanceof GenerationCancelledError) {
        throw error;
      }

      if (!(error instanceof DecisionBriefContractError)) {
        throw error;
      }

      lastError = error.message;

      if (attempt >= MAX_DECISION_BRIEF_RETRIES) {
        throw error;
      }

      retryCount += 1;
    }
  }

  throw new DecisionBriefContractError(lastError);
}
