import { ollamaGenerate } from "../ollamaClient";
import {
  buildChunkExtractionPrompt,
  buildChunkExtractionRetryPrompt,
} from "../prompts";
import {
  STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS,
  type StructuralExpectation,
} from "../captureLayerStructuralReadiness";
import { CHUNK_EXTRACTION_JSON_SCHEMA } from "./chunkExtractionSchema";
import { ChunkExtractionContractError } from "./chunkExtractionErrors";
import { parsePartialCaptureSignalsJson } from "./parsePartialCaptureSignals";
import type {
  ChunkExtractionInput,
  ChunkExtractionOutput,
  LongInputCaptureCapability,
} from "./types";

const MAX_CHUNK_RETRIES = 1;

async function requestChunkSignals(
  input: ChunkExtractionInput,
  prompt: string,
): Promise<string> {
  return ollamaGenerate({
    prompt,
    format: CHUNK_EXTRACTION_JSON_SCHEMA,
    temperature: 0,
    think: false,
    signal: input.signal,
  });
}

export async function extractOllamaChunkSignals(
  input: ChunkExtractionInput,
): Promise<ChunkExtractionOutput> {
  let retryCount = 0;
  let lastError = "Chunk extraction failed.";

  for (let attempt = 0; attempt <= MAX_CHUNK_RETRIES; attempt += 1) {
    const prompt =
      attempt === 0
        ? buildChunkExtractionPrompt(input)
        : buildChunkExtractionRetryPrompt(input, lastError);

    try {
      const modelText = await requestChunkSignals(input, prompt);
      return {
        signals: parsePartialCaptureSignalsJson(modelText, input),
        retryCount,
      };
    } catch (error) {
      if (!(error instanceof ChunkExtractionContractError)) {
        throw error;
      }

      lastError = error.message;

      if (attempt >= MAX_CHUNK_RETRIES) {
        throw error;
      }

      retryCount += 1;
    }
  }

  throw new ChunkExtractionContractError(lastError);
}

export const ollamaLongInputCaptureCapability: LongInputCaptureCapability = {
  extractChunkSignals: extractOllamaChunkSignals,
  resolveStructuralExpectations(): StructuralExpectation {
    return STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS;
  },
};
