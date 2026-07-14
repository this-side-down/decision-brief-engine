import { describe, expect, it } from "vitest";
import { parseDecisionBriefMarkdownOnlyJson } from "./parseDecisionBriefMarkdownOnly";

describe("parseDecisionBriefMarkdownOnlyJson", () => {
  it("parses markdown-only JSON without decisionTrace", () => {
    const parsed = parseDecisionBriefMarkdownOnlyJson(
      JSON.stringify({ markdown: "# Decision Brief\n\n## Summary\n\nGrounded summary." }),
    );

    expect(parsed.markdown).toContain("# Decision Brief");
    expect(parsed.decisionTrace.entries).toEqual([]);
  });

  it("rejects decisionTrace in markdown-only output", () => {
    expect(() =>
      parseDecisionBriefMarkdownOnlyJson(
        JSON.stringify({
          markdown: "# Decision Brief",
          decisionTrace: { entries: [], created_at: "1970-01-01T00:00:00.000Z" },
        }),
      ),
    ).toThrow(/must not include "decisionTrace"/);
  });
});
