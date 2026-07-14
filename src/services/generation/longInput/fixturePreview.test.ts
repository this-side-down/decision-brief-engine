import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { planLongInput } from "./planLongInput";
import { normalizeSourceText } from "./normalizeSourceText";
import { segmentSourceText, validateSourceCoverage } from "./segmentSource";

describe("platform fixture segmentation preview", () => {
  it("segments the long-form fixture into multiple chunks", () => {
    const text = normalizeSourceText(
      readFileSync(
        "fixtures/examples/platform-rearchitecture-review/messy-notes.md",
        "utf8",
      ),
    );
    expect(text.length).toBeGreaterThan(4500);
    const chunks = segmentSourceText(text);
    const coverage = validateSourceCoverage(text, chunks);
    expect(coverage.complete).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
    const plan = planLongInput(text);
    expect(plan.strategy).toBe("hierarchical");
    expect(plan.chunks.length).toBeGreaterThan(1);
    console.log(
      "chunks",
      plan.chunks.length,
      plan.chunks.map((chunk) => [
        chunk.id,
        chunk.sourceRange,
        chunk.text.length,
        chunk.boundaryKind,
      ]),
    );
  });
});
