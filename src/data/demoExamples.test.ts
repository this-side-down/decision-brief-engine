import { describe, expect, it } from "vitest";
import {
  DEMO_EXAMPLES,
  DEFAULT_DEMO_EXAMPLE_ID,
  demoExampleSourceLabel,
  getDemoExample,
  parseDemoExampleId,
} from "./demoExamples";
import {
  EXAMPLE_FIXTURES,
  MOCK_CAPTURE_LAYERS_BY_EXAMPLE_ID,
  MOCK_DECISION_BRIEFS_BY_EXAMPLE_ID,
} from "./exampleFixtures";

describe("demoExamples", () => {
  it("exposes only browser-compatible public demo examples in the gallery", () => {
    expect(DEMO_EXAMPLES.map((example) => example.id).sort()).toEqual([
      "household-move-planning",
      "local-inference-setup-flow",
      "q4-workforce-allocation",
    ]);
    expect(DEMO_EXAMPLES.map((example) => example.title).sort()).toEqual([
      "Household Move Planning",
      "Local Inference Setup Flow",
      "Q4 Workforce Allocation",
    ]);
    expect(
      DEMO_EXAMPLES.some(
        (example) => example.id === "platform-rearchitecture-review",
      ),
    ).toBe(false);
  });

  it("preserves platform-rearchitecture-review for long-input and evaluation paths", () => {
    expect(EXAMPLE_FIXTURES.map((fixture) => fixture.metadata.id).sort()).toEqual([
      "household-move-planning",
      "local-inference-setup-flow",
      "platform-rearchitecture-review",
      "q4-workforce-allocation",
    ]);
    const example = getDemoExample("platform-rearchitecture-review");
    expect(example?.title).toBe("Platform Re-Architecture Review");
    expect(example?.rawNotes.trim().length).toBeGreaterThan(100);
    expect(MOCK_CAPTURE_LAYERS_BY_EXAMPLE_ID["platform-rearchitecture-review"]).toBeDefined();
    expect(MOCK_DECISION_BRIEFS_BY_EXAMPLE_ID["platform-rearchitecture-review"]).toBeDefined();
  });

  it("defaults to the Strategy hero example", () => {
    expect(DEFAULT_DEMO_EXAMPLE_ID).toBe("q4-workforce-allocation");
  });

  it("loads non-empty raw notes for each public gallery example", () => {
    for (const example of DEMO_EXAMPLES) {
      expect(example.rawNotes.trim().length).toBeGreaterThan(100);
      expect(example.sourceLabel).toBe(demoExampleSourceLabel(example.id));
      expect(example.positioning.length).toBeGreaterThan(0);
    }
  });

  it("parses demo source labels", () => {
    expect(parseDemoExampleId("demo:local-inference-setup-flow")).toBe(
      "local-inference-setup-flow",
    );
    expect(parseDemoExampleId("Construction workforce planning example")).toBe(
      null,
    );
  });

  it("maps fixtures to the correct brief type and raw notes", () => {
    for (const fixture of EXAMPLE_FIXTURES) {
      const example = getDemoExample(fixture.metadata.id);
      expect(example?.briefTypeId).toBe(fixture.metadata.briefTypeId);
      expect(example?.rawNotes).toBe(fixture.rawNotes);
      expect(example?.title).toBe(fixture.metadata.title);
    }
  });

  it("includes customer-side Q4 workforce allocation strategy content", () => {
    const example = getDemoExample("q4-workforce-allocation");
    expect(example?.briefTypeId).toBe("strategy");
    expect(example?.rawNotes.toLowerCase()).toContain("workforce allocation");
    expect(example?.rawNotes.toLowerCase()).toContain("hospital project");
    expect(example?.rawNotes.toLowerCase()).toContain("superintendent");
  });
});
