import { describe, expect, it } from "vitest";
import { selectRepresentativeChunkSentences } from "./genericMockCapture";

describe("selectRepresentativeChunkSentences", () => {
  it("retains the single sentence for one-sentence chunks", () => {
    const sentences = ["Only one sentence here."];

    expect(selectRepresentativeChunkSentences(sentences)).toEqual(sentences);
  });

  it("retains both sentences for two-sentence chunks", () => {
    const sentences = ["First sentence.", "Second sentence."];

    expect(selectRepresentativeChunkSentences(sentences)).toEqual(sentences);
  });

  it("selects first, middle, and final sentences for longer chunks", () => {
    const sentences = [
      "First sentence.",
      "Second sentence.",
      "Third sentence.",
      "Fourth sentence.",
      "Fifth sentence.",
    ];

    expect(selectRepresentativeChunkSentences(sentences)).toEqual([
      "First sentence.",
      "Third sentence.",
      "Fifth sentence.",
    ]);
  });

  it("keeps all three sentences when a chunk has exactly three", () => {
    const sentences = ["First sentence.", "Second sentence.", "Third sentence."];

    expect(selectRepresentativeChunkSentences(sentences)).toEqual(sentences);
  });

  it("does not duplicate selected sentences", () => {
    const sentences = ["Alpha.", "Beta.", "Gamma.", "Delta."];

    const selected = selectRepresentativeChunkSentences(sentences);

    expect(selected).toEqual(["Alpha.", "Beta.", "Delta."]);
    expect(new Set(selected).size).toBe(selected.length);
  });
});
