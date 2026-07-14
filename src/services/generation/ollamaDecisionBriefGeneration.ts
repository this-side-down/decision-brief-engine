import { ollamaGenerate } from "./ollamaClient";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";
import type {
  DecisionArtifactDiagnostics,
  DecisionArtifactDiagnosticsHolder,
} from "./decisionArtifactDiagnostics";
import { DECISION_BRIEF_RESULT_JSON_SCHEMA } from "./decisionBriefResultSchema";
import { parseDecisionBriefResultStrict } from "./parseDecisionBriefResultStrict";
import {
  buildDecisionBriefPrompt,
  buildDecisionBriefRetryPrompt,
} from "./prompts";
import type {
  DecisionBriefResult,
  GenerateDecisionBriefInput,
  GenerateDecisionBriefOptions,
} from "./types";
import { GenerationCancelledError } from "./webGpuErrors";

const MAX_DECISION_BRIEF_RETRIES = 1;

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

function recordDecisionArtifactDiagnostics(
  holder: DecisionArtifactDiagnosticsHolder | undefined,
  diagnostics: DecisionArtifactDiagnostics,
): void {
  if (!holder) {
    return;
  }

  holder.value = diagnostics;
}

export async function generateOllamaDecisionBrief(
  input: GenerateDecisionBriefInput,
  options: GenerateDecisionBriefOptions = {},
): Promise<DecisionBriefResult> {
  const started = Date.now();
  let retryCount = 0;
  let lastError = "Decision Brief generation failed.";
  const diagnosticsHolder = options.diagnostics;

  if (diagnosticsHolder) {
    diagnosticsHolder.value = null;
  }

  const writeDiagnostics = (briefRetryCount: number) => {
    recordDecisionArtifactDiagnostics(diagnosticsHolder, {
      strategy: "combined",
      briefRetryCount,
      traceRetryCount: null,
      briefGenerationLatencyMs: Date.now() - started,
      traceGenerationLatencyMs: null,
    });
  };

  for (let attempt = 0; attempt <= MAX_DECISION_BRIEF_RETRIES; attempt += 1) {
    const prompt =
      attempt === 0
        ? buildDecisionBriefPrompt(input, { mode: "structured_response" })
        : buildDecisionBriefRetryPrompt(input, lastError);

    try {
      const rawText = await requestCombinedDecisionBrief(prompt, options.signal);
      const result = parseDecisionBriefResultStrict(rawText);

      writeDiagnostics(retryCount);

      return result;
    } catch (error) {
      if (error instanceof GenerationCancelledError) {
        writeDiagnostics(retryCount);
        throw error;
      }

      if (!(error instanceof DecisionBriefContractError)) {
        writeDiagnostics(retryCount);
        throw error;
      }

      lastError = error.message;

      if (attempt >= MAX_DECISION_BRIEF_RETRIES) {
        writeDiagnostics(retryCount);
        throw error;
      }

      retryCount += 1;
    }
  }

  writeDiagnostics(retryCount);
  throw new DecisionBriefContractError(lastError);
}
