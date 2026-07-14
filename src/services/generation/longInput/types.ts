import type { BriefType } from "../../../types/brief";
import type { CaptureLayer } from "../../../types/captureLayer";

export type SourceRange = {
  start: number;
  end: number;
};

export type ChunkBoundaryKind =
  | "speaker_turn"
  | "paragraph"
  | "section"
  | "fallback";

export type SourceChunk = {
  id: string;
  index: number;
  text: string;
  sourceRange: SourceRange;
  boundaryKind: ChunkBoundaryKind;
};

export type LongInputStrategy = "single_pass" | "hierarchical";

export type LongInputPlan = {
  strategy: LongInputStrategy;
  chunks: SourceChunk[];
  totalSourceLength: number;
};

export type EvidenceReference = {
  text: string;
  sourceChunkId: string;
  sourceRange: SourceRange;
};

export type SignalConflict = {
  topic: string;
  statementA: string;
  statementB: string;
  sourceChunkIds: string[];
};

export type UnresolvedReference = {
  term: string;
  note: string;
  sourceChunkId: string;
};

export type PartialCaptureSignals = {
  chunkId: string;
  sourceRange: SourceRange;
  source_summary?: string;
  decision_context?: string;
  stated_decision?: string;
  implied_decision?: string;
  goals: string[];
  stakeholders: string[];
  options_considered: string[];
  constraints: string[];
  risks: string[];
  assumptions: string[];
  evidence: EvidenceReference[];
  open_questions: string[];
  tensions: string[];
  recommendation_candidate?: string;
  confidence?: CaptureLayer["confidence"];
  missing_context: string[];
  suggested_next_steps: string[];
  conflicts: SignalConflict[];
  unresolved_references: UnresolvedReference[];
};

export type ChunkExtractionInput = {
  chunk: SourceChunk;
  briefType: BriefType;
  sourceLabel?: string;
  fullSourceText: string;
  chunkCount: number;
};

export type MergeCaptureSignalsInput = {
  plan: LongInputPlan;
  partialResults: PartialCaptureSignals[];
  briefType: BriefType;
  fullSourceText: string;
};

export type LongInputProgressPhase =
  | "preparing"
  | "processing_chunk"
  | "merging"
  | "validating";

export type LongInputProgressState = {
  phase: LongInputProgressPhase;
  chunkIndex?: number;
  chunkCount?: number;
};

export type LongInputCaptureCapability = {
  extractChunkSignals(
    input: ChunkExtractionInput,
  ): Promise<PartialCaptureSignals>;
};

export function formatLongInputProgressMessage(
  progress: LongInputProgressState,
): string {
  switch (progress.phase) {
    case "preparing":
      return "Preparing long input…";
    case "processing_chunk":
      return `Processing section ${progress.chunkIndex ?? 0} of ${progress.chunkCount ?? 0}…`;
    case "merging":
      return "Merging decision signals…";
    case "validating":
      return "Validating Capture Layer…";
  }
}
