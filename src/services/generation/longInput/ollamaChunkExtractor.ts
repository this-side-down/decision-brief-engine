import { ollamaGenerate } from "../ollamaClient";
import {
  buildChunkExtractionPrompt,
  buildChunkExtractionRetryPrompt,
} from "../prompts";
import {
  GENERIC_MOCK_STRUCTURAL_EXPECTATIONS,
  STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS,
  type StructuralExpectation,
} from "../captureLayerStructuralReadiness";
import { CHUNK_EXTRACTION_JSON_SCHEMA } from "./chunkExtractionSchema";
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
      lastError = error instanceof Error ? error.message : String(error);

      const isContractFailure =
        /valid JSON|missing required field|must be a string|must be an array|confidence must|placeholder text|conflict|unresolved reference/i.test(
          lastError,
        );

      if (!isContractFailure || attempt >= MAX_CHUNK_RETRIES) {
        throw error;
      }

      retryCount += 1;
    }
  }

  throw new Error(lastError);
}

export const ollamaLongInputCaptureCapability: LongInputCaptureCapability = {
  extractChunkSignals: extractOllamaChunkSignals,
  resolveStructuralExpectations(): StructuralExpectation {
    return STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS;
  },
};
