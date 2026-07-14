import { parseDemoExampleId } from "../../../data/demoExamples";
import { extractGenericMockChunkSignals } from "../genericMockCapture";
import {
  GENERIC_MOCK_STRUCTURAL_EXPECTATIONS,
  STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS,
  type StructuralExpectation,
} from "../captureLayerStructuralReadiness";
import type {
  ChunkExtractionInput,
  ChunkExtractionOutput,
  LongInputCaptureCapability,
  PartialCaptureSignals,
} from "./types";
import platformRearchitectureChunkSignals from "../../../../fixtures/examples/platform-rearchitecture-review/chunk-partial-signals.json";

type FixtureChunkSignals = Record<string, PartialCaptureSignals>;

const FIXTURE_CHUNK_SIGNALS_BY_EXAMPLE_ID: Record<string, FixtureChunkSignals> =
  {
    "platform-rearchitecture-review":
      platformRearchitectureChunkSignals as FixtureChunkSignals,
  };

const AUTHORED_MOCK_LONG_FORM_FIXTURES = new Set([
  "platform-rearchitecture-review",
]);

function parseLongInputFixtureId(sourceLabel?: string): string | null {
  const demoExampleId = parseDemoExampleId(sourceLabel);
  if (demoExampleId) {
    return demoExampleId;
  }

  if (!sourceLabel?.startsWith("demo:")) {
    return null;
  }

  const exampleId = sourceLabel.slice("demo:".length);
  return FIXTURE_CHUNK_SIGNALS_BY_EXAMPLE_ID[exampleId] ? exampleId : null;
}

export async function extractMockChunkSignals(
  input: ChunkExtractionInput,
): Promise<ChunkExtractionOutput> {
  const fixtureExampleId = parseLongInputFixtureId(input.sourceLabel);
  if (fixtureExampleId) {
    const fixtureSignals = FIXTURE_CHUNK_SIGNALS_BY_EXAMPLE_ID[fixtureExampleId];
    const chunkSignals = fixtureSignals?.[input.chunk.id];
    if (chunkSignals) {
      return {
        signals: withPartialDefaults({
          ...chunkSignals,
          chunkId: input.chunk.id,
          sourceRange: input.chunk.sourceRange,
          evidence: (chunkSignals.evidence ?? []).map((reference) => ({
            ...reference,
            sourceChunkId: input.chunk.id,
            sourceRange: input.chunk.sourceRange,
          })),
        }),
        retryCount: 0,
      };
    }
  }

  return {
    signals: extractGenericMockChunkSignals(input),
    retryCount: 0,
  };
}

function withPartialDefaults(
  signals: PartialCaptureSignals,
): PartialCaptureSignals {
  return {
    chunkId: signals.chunkId,
    sourceRange: signals.sourceRange,
    source_summary: signals.source_summary,
    decision_context: signals.decision_context,
    stated_decision: signals.stated_decision ?? "",
    implied_decision: signals.implied_decision ?? "",
    goals: signals.goals ?? [],
    stakeholders: signals.stakeholders ?? [],
    options_considered: signals.options_considered ?? [],
    constraints: signals.constraints ?? [],
    risks: signals.risks ?? [],
    assumptions: signals.assumptions ?? [],
    evidence: signals.evidence ?? [],
    open_questions: signals.open_questions ?? [],
    tensions: signals.tensions ?? [],
    recommendation_candidate: signals.recommendation_candidate ?? "",
    confidence: signals.confidence ?? "Medium",
    missing_context: signals.missing_context ?? [],
    suggested_next_steps: signals.suggested_next_steps ?? [],
    conflicts: signals.conflicts ?? [],
    unresolved_references: signals.unresolved_references ?? [],
  };
}

function resolveMockStructuralExpectations(
  sourceLabel?: string,
): StructuralExpectation {
  const fixtureId = parseLongInputFixtureId(sourceLabel);
  if (fixtureId && AUTHORED_MOCK_LONG_FORM_FIXTURES.has(fixtureId)) {
    return STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS;
  }

  return GENERIC_MOCK_STRUCTURAL_EXPECTATIONS;
}

export const mockLongInputCaptureCapability: LongInputCaptureCapability = {
  extractChunkSignals: extractMockChunkSignals,
  resolveStructuralExpectations: resolveMockStructuralExpectations,
};
