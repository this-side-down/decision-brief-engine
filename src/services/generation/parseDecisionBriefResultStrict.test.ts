import { describe, expect, it } from "vitest";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";
import { parseDecisionBriefResultStrict } from "./parseDecisionBriefResultStrict";

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

describe("parseDecisionBriefResultStrict", () => {
  it("parses a valid combined envelope", () => {
    const envelope = {
      markdown: "# Decision Brief\n\nSome content.",
      decisionTrace: VALID_TRACE,
    };
    const result = parseDecisionBriefResultStrict(JSON.stringify(envelope));
    expect(result.markdown).toContain("# Decision Brief");
    expect(result.decisionTrace.entries).toHaveLength(1);
  });

  it("throws DecisionBriefContractError on invalid JSON", () => {
    expect(() => parseDecisionBriefResultStrict("not json")).toThrow(
      DecisionBriefContractError,
    );
  });

  it("throws DecisionBriefContractError when markdown is missing", () => {
    const envelope = { decisionTrace: VALID_TRACE };
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      DecisionBriefContractError,
    );
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      "markdown",
    );
  });

  it("throws DecisionBriefContractError when markdown is empty", () => {
    const envelope = { markdown: "", decisionTrace: VALID_TRACE };
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      DecisionBriefContractError,
    );
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      "markdown",
    );
  });

  it("throws DecisionBriefContractError when decisionTrace is missing", () => {
    const envelope = { markdown: "# Decision Brief\n\nContent." };
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      DecisionBriefContractError,
    );
  });

  it("throws DecisionBriefContractError for malformed trace entry", () => {
    const envelope = {
      markdown: "# Decision Brief\n\nContent.",
      decisionTrace: {
        entries: [{ ...VALID_ENTRY, would_change_if: [] }],
        created_at: "2026-01-01T00:00:00.000Z",
      },
    };
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      DecisionBriefContractError,
    );
  });

  it("throws DecisionBriefContractError for invalid confidence", () => {
    const envelope = {
      markdown: "# Decision Brief\n\nContent.",
      decisionTrace: {
        entries: [{ ...VALID_ENTRY, confidence: "Very High" }],
        created_at: "2026-01-01T00:00:00.000Z",
      },
    };
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      DecisionBriefContractError,
    );
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      "confidence",
    );
  });

  it("throws DecisionBriefContractError for invalid entry kind", () => {
    const envelope = {
      markdown: "# Decision Brief\n\nContent.",
      decisionTrace: {
        entries: [{ ...VALID_ENTRY, kind: "summary" }],
        created_at: "2026-01-01T00:00:00.000Z",
      },
    };
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      DecisionBriefContractError,
    );
    expect(() => parseDecisionBriefResultStrict(JSON.stringify(envelope))).toThrow(
      "kind",
    );
  });
});
