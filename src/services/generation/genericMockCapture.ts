import type { BriefType } from "../../types/brief";
import type { CaptureLayer } from "../../types/captureLayer";
import type { GenerateCaptureLayerInput } from "./types";
import type { ChunkExtractionInput, EvidenceReference, PartialCaptureSignals } from "./longInput/types";
import { normalizeSourceText } from "./longInput/normalizeSourceText";

export function summarizeMockSource(rawInputText: string): string {
  const normalizedInput = normalizeSourceText(rawInputText).replace(/\s+/g, " ");

  if (normalizedInput.length <= 180) {
    return normalizedInput;
  }

  return `${normalizedInput.slice(0, 177)}...`;
}

export function buildGenericMockCaptureLayer(
  input: GenerateCaptureLayerInput,
): CaptureLayer {
  const sourceSummary = summarizeMockSource(input.rawInputText);
  const briefTypeName = input.briefType.name;

  return {
    source_summary: sourceSummary,
    decision_context: `Mock capture for a ${briefTypeName}. The pasted notes appear to contain decision context that should be structured before drafting a brief.`,
    stated_decision: "",
    implied_decision: `Clarify the primary ${input.briefType.id} decision before producing the final Decision Brief.`,
    goals: input.briefType.guidance.outputEmphasis.slice(0, 2),
    stakeholders: ["Decision owner", "Affected team", "Reviewer"],
    options_considered: input.briefType.guidance.exampleDecisionQuestions
      .slice(0, 2)
      .map((question) => `Option implied by: ${question}`),
    constraints: [
      "Source material may be incomplete",
      "MVP uses mocked generation",
    ],
    risks: [
      "The source notes may omit important context",
      "The final recommendation should not exceed the captured evidence",
    ],
    assumptions: [
      "The pasted notes are relevant to the selected brief type",
      "The user will review the Capture Layer before relying on the final brief",
    ],
    evidence: [sourceSummary],
    open_questions: [
      "What decision needs to be made now?",
      "Which facts are confirmed versus inferred?",
    ],
    tensions: [
      "Speed of decision-making versus confidence in available context",
    ],
    recommendation_candidate: "",
    confidence: "Medium",
    missing_context: [
      "Explicit decision owner",
      "Confirmed success criteria",
      "Evidence strong enough to support a recommendation",
    ],
    suggested_next_steps: [
      "Review the mocked Capture Layer for missing context",
      "Confirm the selected brief type before generating a Decision Brief",
    ],
  };
}

function extractChunkSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function selectRepresentativeChunkSentences(sentences: string[]): string[] {
  if (sentences.length <= 2) {
    return [...sentences];
  }

  const indices = new Set<number>([
    0,
    Math.floor((sentences.length - 1) / 2),
    sentences.length - 1,
  ]);

  return [...indices]
    .sort((left, right) => left - right)
    .map((index) => sentences[index]);
}

function detectExplicitStatedDecision(text: string): string {
  const match = text.match(
    /(?:^|\n)\s*(?:\*\*[^*]+:\*\*\s*)?(?:stated decision|final decision(?: for the record)?|decision captured|we decided)\s*:\s*([^\n.!?]+)/i,
  );

  return match?.[1]?.trim() ?? "";
}

function buildChunkEvidence(
  chunkText: string,
  chunkId: string,
  sourceRange: PartialCaptureSignals["sourceRange"],
): EvidenceReference[] {
  const sentences = extractChunkSentences(chunkText);
  const evidence = selectRepresentativeChunkSentences(sentences).map((sentence) => ({
    text: sentence,
    sourceChunkId: chunkId,
    sourceRange,
  }));

  if (evidence.length === 0 && chunkText.trim().length > 0) {
    evidence.push({
      text: chunkText.trim().slice(0, 160),
      sourceChunkId: chunkId,
      sourceRange,
    });
  }

  return evidence;
}

function emptyPartialSignals(
  chunkId: string,
  sourceRange: PartialCaptureSignals["sourceRange"],
): PartialCaptureSignals {
  return {
    chunkId,
    sourceRange,
    stated_decision: "",
    implied_decision: "",
    goals: [],
    stakeholders: [],
    options_considered: [],
    constraints: [],
    risks: [],
    assumptions: [],
    evidence: [],
    open_questions: [],
    tensions: [],
    missing_context: [],
    suggested_next_steps: [],
    conflicts: [],
    unresolved_references: [],
    confidence: "Medium",
  };
}

export function extractGenericMockChunkSignals(
  input: ChunkExtractionInput,
): PartialCaptureSignals {
  const { chunk, briefType, chunkCount } = input;
  const isFirst = chunk.index === 0;
  const isLast = chunk.index === chunkCount - 1;

  const partial = emptyPartialSignals(chunk.id, chunk.sourceRange);
  partial.evidence = buildChunkEvidence(
    chunk.text,
    chunk.id,
    chunk.sourceRange,
  );
  partial.stated_decision = detectExplicitStatedDecision(chunk.text);

  if (isFirst) {
    partial.decision_context = `Mock capture for a ${briefType.name}. The pasted notes appear to contain decision context that should be structured before drafting a brief.`;
    partial.implied_decision = `Clarify the primary ${briefType.id} decision before producing the final Decision Brief.`;
    partial.goals = briefType.guidance.outputEmphasis.slice(0, 2);
    partial.stakeholders = ["Decision owner", "Affected team", "Reviewer"];
    partial.options_considered = briefType.guidance.exampleDecisionQuestions
      .slice(0, 1)
      .map((question) => `Option implied by: ${question}`);
    partial.constraints = [
      "Source material may be incomplete",
      "MVP uses mocked generation",
    ];
    partial.risks = [
      "The source notes may omit important context",
      "The final recommendation should not exceed the captured evidence",
    ];
    partial.assumptions = [
      "The pasted notes are relevant to the selected brief type",
      "The user will review the Capture Layer before relying on the final brief",
    ];
  } else if (chunk.index === 1) {
    partial.options_considered = briefType.guidance.exampleDecisionQuestions
      .slice(1, 2)
      .map((question) => `Option implied by: ${question}`);
  }

  if (isLast) {
    partial.open_questions = [
      "What decision needs to be made now?",
      "Which facts are confirmed versus inferred?",
    ];
    partial.missing_context = [
      "Explicit decision owner",
      "Confirmed success criteria",
      "Evidence strong enough to support a recommendation",
    ];
    partial.suggested_next_steps = [
      "Review the mocked Capture Layer for missing context",
      "Confirm the selected brief type before generating a Decision Brief",
    ];
    partial.tensions = [
      "Speed of decision-making versus confidence in available context",
    ];
  }

  return partial;
}
