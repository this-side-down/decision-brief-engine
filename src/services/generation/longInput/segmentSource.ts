import { CAPTURE_INPUT_BUDGET_POLICY } from "./inputBudgetPolicy";
import { normalizeSourceText } from "./normalizeSourceText";
import type { ChunkBoundaryKind, SourceChunk, SourceRange } from "./types";

const SPEAKER_TURN_PATTERN = /^(?:\*\*[^*]+\*\*|[A-Z][A-Za-z .'-]{1,40}:)\s*/m;
const SECTION_HEADER_PATTERN = /^#{1,3}\s+/m;

function trimSegment(text: string): string {
  return text.replace(/^\s+/, "").replace(/\s+$/, "");
}

function detectBoundaryKind(segment: string): ChunkBoundaryKind {
  if (SPEAKER_TURN_PATTERN.test(segment)) {
    return "speaker_turn";
  }

  if (SECTION_HEADER_PATTERN.test(segment)) {
    return "section";
  }

  return "paragraph";
}

type SegmentCandidate = {
  start: number;
  end: number;
  boundaryKind: ChunkBoundaryKind;
};

function findBoundaryStarts(text: string, pattern: RegExp): number[] {
  const globalPattern = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
  const starts = [...text.matchAll(globalPattern)]
    .map((match) => match.index ?? -1)
    .filter((index) => index >= 0);

  if (starts.length === 0 || starts[0] !== 0) {
    return starts.length > 0 && starts[0] > 0 ? [0, ...starts] : [0];
  }

  return starts;
}

function candidateSplitStarts(text: string): Array<{
  start: number;
  boundaryKind: ChunkBoundaryKind;
}> {
  const speakerStarts = findBoundaryStarts(
    text,
    /(?=^(?:\*\*[^*]+\*\*|[A-Z][A-Za-z .'-]{1,40}:)\s*)/m,
  ).map((start) => ({
    start,
    boundaryKind: "speaker_turn" as const,
  }));

  if (speakerStarts.length > 1) {
    return speakerStarts;
  }

  const sectionStarts = findBoundaryStarts(text, /(?=^#{1,3}\s+)/m).map(
    (start) => ({
      start,
      boundaryKind: "section" as const,
    }),
  );

  if (sectionStarts.length > 1) {
    return sectionStarts;
  }

  const paragraphStarts = findBoundaryStarts(text, /(?=\n{2,})/m).map(
    (start) => ({
      start,
      boundaryKind: "paragraph" as const,
    }),
  );

  if (paragraphStarts.length > 1) {
    return paragraphStarts;
  }

  return [{ start: 0, boundaryKind: "fallback" }];
}

function buildSegmentsFromStarts(
  text: string,
  starts: Array<{ start: number; boundaryKind: ChunkBoundaryKind }>,
): SegmentCandidate[] {
  const uniqueStarts = [...new Set(starts.map((item) => item.start))].sort(
    (a, b) => a - b,
  );

  const segments: SegmentCandidate[] = [];
  for (let index = 0; index < uniqueStarts.length; index += 1) {
    const start = uniqueStarts[index];
    const end =
      index + 1 < uniqueStarts.length
        ? uniqueStarts[index + 1]
        : text.length;
    const boundaryKind =
      starts.find((item) => item.start === start)?.boundaryKind ?? "fallback";

    if (trimSegment(text.slice(start, end)).length > 0) {
      segments.push({ start, end, boundaryKind });
    }
  }

  return segments;
}

function splitOversizedSegment(
  text: string,
  segment: SegmentCandidate,
  maxChars: number,
  minChars: number,
): SegmentCandidate[] {
  const segmentText = text.slice(segment.start, segment.end);
  if (segmentText.length <= maxChars) {
    return [segment];
  }

  const results: SegmentCandidate[] = [];
  let cursor = segment.start;

  while (cursor < segment.end) {
    const remaining = segment.end - cursor;
    if (remaining <= maxChars) {
      results.push({
        start: cursor,
        end: segment.end,
        boundaryKind: "fallback",
      });
      break;
    }

    const window = text.slice(cursor, cursor + maxChars);
    const sentenceBreak = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("? "),
      window.lastIndexOf("! "),
      window.lastIndexOf("\n"),
    );
    const splitAt =
      sentenceBreak >= minChars ? cursor + sentenceBreak + 1 : cursor + maxChars;

    results.push({
      start: cursor,
      end: splitAt,
      boundaryKind: "fallback",
    });
    cursor = splitAt;
  }

  return results;
}

function mergeSmallSegments(
  text: string,
  segments: SegmentCandidate[],
  maxChars: number,
  minChars: number,
): SegmentCandidate[] {
  if (segments.length === 0) {
    return segments;
  }

  const merged: SegmentCandidate[] = [];
  let buffer: SegmentCandidate | null = null;

  for (const segment of segments) {
    const segmentLength = segment.end - segment.start;

    if (!buffer) {
      buffer = { ...segment };
      continue;
    }

    const bufferLength = buffer.end - buffer.start;
    if (
      bufferLength < minChars ||
      bufferLength + segmentLength <= maxChars
    ) {
      buffer = {
        start: buffer.start,
        end: segment.end,
        boundaryKind: buffer.boundaryKind,
      };
      continue;
    }

    merged.push(buffer);
    buffer = { ...segment };
  }

  if (buffer) {
    merged.push(buffer);
  }

  return merged;
}

export function segmentSourceText(
  rawInputText: string,
  options: {
    maxChunkChars?: number;
    minChunkChars?: number;
  } = {},
): SourceChunk[] {
  const text = normalizeSourceText(rawInputText);
  const maxChunkChars =
    options.maxChunkChars ?? CAPTURE_INPUT_BUDGET_POLICY.chunkTargetMaxRawChars;
  const minChunkChars =
    options.minChunkChars ?? CAPTURE_INPUT_BUDGET_POLICY.chunkMinRawChars;

  const semanticStarts = candidateSplitStarts(text);
  let segments = buildSegmentsFromStarts(text, semanticStarts);

  if (segments.length === 0) {
    segments = [{ start: 0, end: text.length, boundaryKind: "fallback" }];
  } else {
    segments[0].start = 0;
    segments[segments.length - 1].end = text.length;
  }

  segments = mergeSmallSegments(text, segments, maxChunkChars, minChunkChars);
  segments = segments.flatMap((segment) =>
    splitOversizedSegment(text, segment, maxChunkChars, minChunkChars),
  );

  if (segments.length > 0) {
    segments[0].start = 0;
    segments[segments.length - 1].end = text.length;
  }

  return segments.map((segment, index) => ({
    id: `chunk-${String(index + 1).padStart(3, "0")}`,
    index,
    text: trimSegment(text.slice(segment.start, segment.end)),
    sourceRange: {
      start: segment.start,
      end: segment.end,
    } satisfies SourceRange,
    boundaryKind: segment.boundaryKind,
  }));
}

export function validateSourceCoverage(
  sourceText: string,
  chunks: SourceChunk[],
): { complete: boolean; gaps: SourceRange[]; overlaps: SourceRange[] } {
  if (chunks.length === 0) {
    return {
      complete: false,
      gaps: [{ start: 0, end: sourceText.length }],
      overlaps: [],
    };
  }

  const gaps: SourceRange[] = [];
  const overlaps: SourceRange[] = [];
  const sorted = [...chunks].sort(
    (a, b) => a.sourceRange.start - b.sourceRange.start,
  );

  if (sorted[0].sourceRange.start > 0) {
    gaps.push({ start: 0, end: sorted[0].sourceRange.start });
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (current.sourceRange.start > previous.sourceRange.end) {
      gaps.push({
        start: previous.sourceRange.end,
        end: current.sourceRange.start,
      });
    } else if (current.sourceRange.start < previous.sourceRange.end) {
      overlaps.push({
        start: current.sourceRange.start,
        end: previous.sourceRange.end,
      });
    }
  }

  const last = sorted[sorted.length - 1];
  if (last.sourceRange.end < sourceText.length) {
    gaps.push({ start: last.sourceRange.end, end: sourceText.length });
  }

  return {
    complete: gaps.length === 0,
    gaps,
    overlaps,
  };
}
