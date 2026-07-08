import { describe, expect, it } from "vitest";
import {
  DEMO_EXAMPLES,
  demoExampleSourceLabel,
  getDemoExample,
  parseDemoExampleId,
} from "./demoExamples";

describe("demoExamples", () => {
  it("exposes one example per brief type", () => {
    expect(DEMO_EXAMPLES).toHaveLength(3);
    expect(DEMO_EXAMPLES.map((example) => example.briefTypeId).sort()).toEqual([
      "execution",
      "product",
      "strategy",
    ]);
  });

  it("loads non-empty raw notes for each example", () => {
    for (const example of DEMO_EXAMPLES) {
      expect(example.rawNotes.trim().length).toBeGreaterThan(100);
      expect(example.sourceLabel).toBe(demoExampleSourceLabel(example.id));
    }
  });

  it("parses demo source labels", () => {
    expect(parseDemoExampleId("demo:product-prioritization")).toBe(
      "product-prioritization",
    );
    expect(parseDemoExampleId("Construction workforce planning example")).toBe(
      null,
    );
  });

  it("includes construction strategy example", () => {
    const example = getDemoExample("construction-strategy");
    expect(example?.briefTypeId).toBe("strategy");
    expect(example?.rawNotes.toLowerCase()).toContain("specialty trades");
  });
});
