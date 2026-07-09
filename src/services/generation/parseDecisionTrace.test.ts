import { describe, expect, it } from "vitest";
import { parseDecisionTraceJson, validateDecisionTraceObject } from "./parseDecisionTrace";
import { parseDecisionBriefResultJson } from "./parseDecisionBriefResult";

const VALID_BASIS = {
  intent: "Achieve the primary goal.",
  supporting_evidence: ["Observed fact from the source."],
  assumptions_relied_on: [],
  risks_addressed: [],
  risks_accepted: [],
  constraints_respected: [],
  tradeoffs: [],
  alternatives_considered: [],
  missing_context_caveats: [],
};

const VALID_ENTRY = {
  statement: "Proceed with option A.",
  kind: "recommendation",
  basis: VALID_BASIS,
  confidence: "Medium",
  would_change_if: ["If the confirmed budget constraint changes."],
};

const VALID_TRACE = {
  entries: [VALID_ENTRY],
  created_at: "2026-01-01T00:00:00.000Z",
};

function validTraceJson() {
  return JSON.stringify(VALID_TRACE);
}

describe("parseDecisionTraceJson", () => {
  it("accepts a well-formed trace", () => {
    const result = parseDecisionTraceJson(validTraceJson());
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].statement).toBe("Proceed with option A.");
    expect(result.entries[0].kind).toBe("recommendation");
    expect(result.entries[0].confidence).toBe("Medium");
  });

  it("accepts traces with json code fences", () => {
    const fenced = "```json\n" + validTraceJson() + "\n```";
    const result = parseDecisionTraceJson(fenced);
    expect(result.entries).toHaveLength(1);
  });

  it("accepts traces with plain code fences", () => {
    const fenced = "```\n" + validTraceJson() + "\n```";
    const result = parseDecisionTraceJson(fenced);
    expect(result.entries).toHaveLength(1);
  });

  it("accepts an empty entries array", () => {
    const result = parseDecisionTraceJson(
      JSON.stringify({ entries: [], created_at: "2026-01-01T00:00:00.000Z" }),
    );
    expect(result.entries).toHaveLength(0);
  });

  it("accepts next_step kind", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, kind: "next_step" }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const result = parseDecisionTraceJson(JSON.stringify(trace));
    expect(result.entries[0].kind).toBe("next_step");
  });

  it("fills in created_at when absent", () => {
    const trace = { entries: [] };
    const result = parseDecisionTraceJson(JSON.stringify(trace));
    expect(result.created_at).toBeTruthy();
  });

  it("throws on non-JSON input", () => {
    expect(() => parseDecisionTraceJson("not json")).toThrow(
      "Decision Trace response was not valid JSON.",
    );
  });

  it("throws when entries field is missing", () => {
    expect(() =>
      parseDecisionTraceJson(JSON.stringify({ created_at: "2026-01-01T00:00:00.000Z" })),
    ).toThrow("entries");
  });
});

describe("validateDecisionTraceObject — statement validation", () => {
  it("throws on empty statement", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, statement: "" }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      "statement must not be empty",
    );
  });

  it("throws on whitespace-only statement", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, statement: "   " }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      "statement must not be empty",
    );
  });

  it("throws when statement is missing", () => {
    const { statement: _omitted, ...rest } = VALID_ENTRY;
    const trace = { entries: [rest], created_at: "2026-01-01T00:00:00.000Z" };
    expect(() => validateDecisionTraceObject(trace)).toThrow("statement must be a string");
  });
});

describe("validateDecisionTraceObject — kind validation", () => {
  it("throws on invalid kind", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, kind: "action" }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      '"recommendation" or "next_step"',
    );
  });
});

describe("validateDecisionTraceObject — confidence validation", () => {
  it("throws on invalid confidence", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, confidence: "Maybe" }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      '"High", "Medium", or "Low"',
    );
  });
});

describe("validateDecisionTraceObject — basis validation", () => {
  it("throws when basis.intent is empty", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, basis: { ...VALID_BASIS, intent: "" } }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      "basis.intent must not be empty",
    );
  });

  it("throws when basis.intent is whitespace only", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, basis: { ...VALID_BASIS, intent: "  " } }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      "basis.intent must not be empty",
    );
  });

  it("throws when all basis arrays are empty", () => {
    const emptyArrayBasis = {
      intent: "Achieve the goal.",
      supporting_evidence: [],
      assumptions_relied_on: [],
      risks_addressed: [],
      risks_accepted: [],
      constraints_respected: [],
      tradeoffs: [],
      alternatives_considered: [],
      missing_context_caveats: [],
    };
    const trace = {
      entries: [{ ...VALID_ENTRY, basis: emptyArrayBasis }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      "at least one non-empty array field",
    );
  });

  it("accepts basis with only one non-empty array field", () => {
    const partialBasis = {
      intent: "Achieve the goal.",
      supporting_evidence: [],
      assumptions_relied_on: ["The budget is fixed."],
      risks_addressed: [],
      risks_accepted: [],
      constraints_respected: [],
      tradeoffs: [],
      alternatives_considered: [],
      missing_context_caveats: [],
    };
    const trace = {
      entries: [{ ...VALID_ENTRY, basis: partialBasis }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).not.toThrow();
  });
});

describe("validateDecisionTraceObject — would_change_if validation", () => {
  it("throws on empty would_change_if array", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, would_change_if: [] }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      "would_change_if must not be empty",
    );
  });

  it("throws when would_change_if contains an empty string", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, would_change_if: [""] }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      "empty condition",
    );
  });

  it("throws when would_change_if contains whitespace-only string", () => {
    const trace = {
      entries: [{ ...VALID_ENTRY, would_change_if: ["   "] }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow("empty condition");
  });

  it.each([
    "if the situation changes",
    "If the situation changes.",
    "if new information becomes available",
    "If new information is available.",
    "if circumstances change",
    "If circumstances change.",
    "if the context changes",
    "if anything changes",
    "if something changes",
    "if the facts change",
    "new information becomes available",
    "if the situation is different",
  ])("throws on generic condition: %s", (generic) => {
    const trace = {
      entries: [{ ...VALID_ENTRY, would_change_if: [generic] }],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).toThrow(
      "generic or useless condition",
    );
  });

  it("accepts specific, non-generic would_change_if conditions", () => {
    const trace = {
      entries: [
        {
          ...VALID_ENTRY,
          would_change_if: [
            "If the confirmed start date for the hospital project moves beyond Q4.",
            "If HR confirms a candidate can start within two weeks.",
          ],
        },
      ],
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateDecisionTraceObject(trace)).not.toThrow();
  });
});

describe("parseDecisionBriefResultJson", () => {
  it("parses a valid combined envelope", () => {
    const envelope = {
      markdown: "# Decision Brief\n\nSome content.",
      decisionTrace: VALID_TRACE,
    };
    const result = parseDecisionBriefResultJson(JSON.stringify(envelope));
    expect(result.markdown).toContain("# Decision Brief");
    expect(result.decisionTrace.entries).toHaveLength(1);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseDecisionBriefResultJson("not json")).toThrow(
      "Decision Brief result was not valid JSON.",
    );
  });

  it("throws when markdown is missing", () => {
    const envelope = { decisionTrace: VALID_TRACE };
    expect(() => parseDecisionBriefResultJson(JSON.stringify(envelope))).toThrow(
      "markdown",
    );
  });

  it("throws when markdown is empty", () => {
    const envelope = { markdown: "", decisionTrace: VALID_TRACE };
    expect(() => parseDecisionBriefResultJson(JSON.stringify(envelope))).toThrow(
      "markdown",
    );
  });

  it("falls back to empty trace when decisionTrace is missing", () => {
    const envelope = { markdown: "# Decision Brief\n\nContent." };
    const result = parseDecisionBriefResultJson(JSON.stringify(envelope));
    expect(result.markdown).toContain("# Decision Brief");
    expect(result.decisionTrace.entries).toHaveLength(0);
  });

  it("falls back to empty trace when decisionTrace fails validation", () => {
    const envelope = {
      markdown: "# Decision Brief\n\nContent.",
      decisionTrace: {
        entries: [{ ...VALID_ENTRY, would_change_if: [] }],
        created_at: "2026-01-01T00:00:00.000Z",
      },
    };
    const result = parseDecisionBriefResultJson(JSON.stringify(envelope));
    expect(result.markdown).toContain("# Decision Brief");
    expect(result.decisionTrace.entries).toHaveLength(0);
  });

  it("strips json code fences from the envelope", () => {
    const envelope = JSON.stringify({
      markdown: "# Decision Brief\n\nContent.",
      decisionTrace: VALID_TRACE,
    });
    const result = parseDecisionBriefResultJson("```json\n" + envelope + "\n```");
    expect(result.markdown).toContain("# Decision Brief");
  });
});
