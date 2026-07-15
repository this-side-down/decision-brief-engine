import { ollamaGenerate } from "./ollamaClient";
import { buildSourceBoundDecisionTrace } from "./buildSourceBoundDecisionTrace";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";
import type {
  DecisionArtifactDiagnostics,
  DecisionArtifactDiagnosticsHolder,
  MarkdownRetryReasonCategory,
} from "./decisionArtifactDiagnostics";
import {
  evaluateDecisionBriefMarkdownOnlyAcceptance,
  formatMarkdownOnlyAcceptanceFindingLines,
  type MarkdownOnlyAcceptanceFailureCategory,
} from "./decisionBriefMarkdownOnlyAcceptance";
import { DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA } from "./decisionBriefResultSchema";
import { parseDecisionBriefMarkdownOnlyJson } from "./parseDecisionBriefMarkdownOnly";
import {
  buildDecisionBriefMarkdownOnlyRetryPrompt,
  buildDecisionBriefPrompt,
} from "./prompts";
import type {
  DecisionBriefResult,
  GenerateDecisionBriefInput,
  GenerateDecisionBriefOptions,
} from "./types";

/** Stage A allows at most one semantic/parse retry (#154). */
const MAX_MARKDOWN_RETRIES = 1;

async function requestMarkdownOnlyDecisionBrief(
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  return ollamaGenerate({
    prompt,
    format: DECISION_BRIEF_MARKDOWN_ONLY_JSON_SCHEMA,
    temperature: 0,
    think: false,
    signal,
  });
}

/** First failure category becomes the recorded retry reason for diagnostics. */
function firstFailureCategoryToRetryReason(
  category: MarkdownOnlyAcceptanceFailureCategory,
): MarkdownRetryReasonCategory {
  return category;
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

type StageAMarkdownResult = {
  markdown: string;
  attemptCount: number;
  retryReasonCategory: MarkdownRetryReasonCategory;
  latencyMs: number;
};

/**
 * Stage A: model-generated Markdown only. Reuses the existing markdown_only
 * prompt/schema/parser/acceptance infrastructure (#141). Allows at most one
 * typed retry, using concise validator findings only — never the raw
 * rejected output and never hidden reasoning. Cancellation, timeout, and
 * network/infrastructure failures from ollamaGenerate propagate immediately
 * and are never retried.
 */
async function generateStageAMarkdown(
  input: GenerateDecisionBriefInput,
  signal: AbortSignal | undefined,
): Promise<StageAMarkdownResult> {
  const started = Date.now();
  let lastFindingLines: string[] = [];
  let lastRetryReasonCategory: MarkdownRetryReasonCategory = "none";

  for (let attempt = 0; attempt <= MAX_MARKDOWN_RETRIES; attempt += 1) {
    const prompt =
      attempt === 0
        ? buildDecisionBriefPrompt(input, { mode: "markdown_only" })
        : buildDecisionBriefMarkdownOnlyRetryPrompt(input, lastFindingLines);

    // Errors thrown here (GenerationCancelledError, timeout, network/
    // infrastructure failures) are never retried: they propagate
    // immediately, regardless of attempt number.
    const rawText = await requestMarkdownOnlyDecisionBrief(prompt, signal);

    let parsed: DecisionBriefResult;

    try {
      parsed = parseDecisionBriefMarkdownOnlyJson(rawText);
    } catch (parseError) {
      const message =
        parseError instanceof Error
          ? parseError.message
          : "Decision Brief markdown-only result failed to parse.";

      if (attempt >= MAX_MARKDOWN_RETRIES) {
        throw new DecisionBriefContractError(message);
      }

      lastFindingLines = [message];
      lastRetryReasonCategory = "parse_or_schema";
      continue;
    }

    const acceptance = evaluateDecisionBriefMarkdownOnlyAcceptance({
      result: parsed,
      captureLayer: input.captureLayer,
    });

    if (acceptance.accepted) {
      return {
        markdown: parsed.markdown,
        attemptCount: attempt + 1,
        retryReasonCategory: attempt === 0 ? "none" : lastRetryReasonCategory,
        latencyMs: Date.now() - started,
      };
    }

    if (attempt >= MAX_MARKDOWN_RETRIES) {
      throw new DecisionBriefContractError(
        `Decision Brief markdown-only result failed quality validation: ${acceptance.failureCategories.join(", ")}.`,
      );
    }

    lastFindingLines = formatMarkdownOnlyAcceptanceFindingLines(acceptance.detailedFindings);
    lastRetryReasonCategory = firstFailureCategoryToRetryReason(
      acceptance.failureCategories[0] ?? "required_sections",
    );
  }

  // Unreachable: the loop above always returns or throws by the final
  // iteration (attempt === MAX_MARKDOWN_RETRIES).
  throw new DecisionBriefContractError("Decision Brief markdown-only generation failed.");
}

/**
 * Split-stage Ollama Decision Brief generation (#154).
 *
 * Stage A generates Markdown only (model call, <=1 retry). Stage B builds the
 * Decision Trace deterministically from the accepted Capture Layer — no
 * model call, so it is never retried; a structurally-unready Capture Layer
 * surfaces as a typed SourceBoundDecisionTraceConstructionError instead of a
 * second unconstrained model call.
 */
export async function generateOllamaDecisionBrief(
  input: GenerateDecisionBriefInput,
  options: GenerateDecisionBriefOptions = {},
): Promise<DecisionBriefResult> {
  const started = Date.now();
  const diagnosticsHolder = options.diagnostics;

  if (diagnosticsHolder) {
    diagnosticsHolder.value = null;
  }

  let stageA: StageAMarkdownResult;

  try {
    stageA = await generateStageAMarkdown(input, options.signal);
  } catch (error) {
    // Cancellation, timeout, network/infrastructure failures, or a
    // DecisionBriefContractError after Stage A exhausted its one retry — no
    // trace was attempted, so only the elapsed time is known.
    recordDecisionArtifactDiagnostics(diagnosticsHolder, {
      strategy: "split_stage",
      briefRetryCount: 0,
      traceRetryCount: null,
      briefGenerationLatencyMs: Date.now() - started,
      traceGenerationLatencyMs: null,
      markdownAttemptCount: null,
      markdownRetryReasonCategory: null,
      markdownGenerationLatencyMs: null,
      traceConstructionLatencyMs: null,
      traceConstructionStrategy: null,
      totalModelCallCount: null,
    });
    throw error;
  }

  const traceStarted = Date.now();

  try {
    const decisionTrace = buildSourceBoundDecisionTrace(input.captureLayer);
    const traceLatencyMs = Date.now() - traceStarted;

    recordDecisionArtifactDiagnostics(diagnosticsHolder, {
      strategy: "split_stage",
      briefRetryCount: stageA.attemptCount - 1,
      traceRetryCount: 0,
      briefGenerationLatencyMs: stageA.latencyMs,
      traceGenerationLatencyMs: traceLatencyMs,
      markdownAttemptCount: stageA.attemptCount,
      markdownRetryReasonCategory: stageA.retryReasonCategory,
      markdownGenerationLatencyMs: stageA.latencyMs,
      traceConstructionLatencyMs: traceLatencyMs,
      traceConstructionStrategy: "source_bound_projection",
      totalModelCallCount: stageA.attemptCount,
    });

    return { markdown: stageA.markdown, decisionTrace };
  } catch (error) {
    // Includes SourceBoundDecisionTraceConstructionError: a structurally-
    // unready Capture Layer surfaces as a typed contract error here rather
    // than falling back to another model call (#154).
    const traceLatencyMs = Date.now() - traceStarted;

    recordDecisionArtifactDiagnostics(diagnosticsHolder, {
      strategy: "split_stage",
      briefRetryCount: stageA.attemptCount - 1,
      traceRetryCount: 0,
      briefGenerationLatencyMs: stageA.latencyMs,
      traceGenerationLatencyMs: traceLatencyMs,
      markdownAttemptCount: stageA.attemptCount,
      markdownRetryReasonCategory: stageA.retryReasonCategory,
      markdownGenerationLatencyMs: stageA.latencyMs,
      traceConstructionLatencyMs: traceLatencyMs,
      traceConstructionStrategy: "source_bound_projection",
      totalModelCallCount: stageA.attemptCount,
    });

    throw error;
  }
}
