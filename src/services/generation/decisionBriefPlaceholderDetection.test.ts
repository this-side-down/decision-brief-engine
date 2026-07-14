import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import {
  BANNED_CANNED_PHRASES,
  BANNED_CONSULTANT_FILLER,
  BANNED_SENTENCE_OPENERS,
  DECISION_BRIEF_REQUIRED_SECTIONS,
  SENTENCE_ERROR_WORDS,
  SUMMARY_MAX_WORDS,
} from "../../evaluation/decisionBriefWritingRules";
import q4CaptureLayer from "../../../fixtures/examples/q4-workforce-allocation/expected-capture-layer.json";
import q4DecisionTrace from "../../../fixtures/examples/q4-workforce-allocation/expected-decision-trace.json";
import {
  detectDecisionBriefPlaceholderLeakage,
  FORBIDDEN_WEBGPU_PROMPT_PLACEHOLDER_STRINGS,
  normalizeForPlaceholderMatch,
} from "./decisionBriefPlaceholderDetection";
import { createW3PlaceholderLeakedBriefResult } from "./fixtures/w3PlaceholderLeakedBriefResult";
import {
  buildDecisionBriefPrompt,
  resolveCapturePromptVariant,
} from "./prompts";
import {
  DECISION_BRIEF_MARKDOWN_ONLY_RESPONSE_SCHEMA_JSON,
  DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON,
} from "./webGpuGenerationSchemas";
import { DECISION_BRIEF_MARKDOWN_STRUCTURE } from "./types";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/examples/q4-workforce-allocation",
);

const Q4_BRIEF_MARKDOWN = readFileSync(
  join(fixtureRoot, "expected-decision-brief.md"),
  "utf-8",
);

const baseBriefInput = {
  captureLayer: q4CaptureLayer,
  briefType: STRATEGY_DECISION_BRIEF,
  briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
  markdownStructure: [...DECISION_BRIEF_MARKDOWN_STRUCTURE],
};

describe("buildDecisionBriefPrompt structured WebGPU mode", () => {
  it("contains no known forbidden placeholder strings", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "structured_response",
    });

    for (const forbidden of FORBIDDEN_WEBGPU_PROMPT_PLACEHOLDER_STRINGS) {
      expect(prompt).not.toContain(forbidden);
    }

    expect(
      normalizeForPlaceholderMatch(prompt).includes(
        normalizeForPlaceholderMatch("verbatim from the brief"),
      ),
    ).toBe(false);
  });

  it("still includes semantic field requirements", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "structured_response",
    });

    expect(prompt).toContain("supporting_evidence");
    expect(prompt).toContain("would_change_if");
    expect(prompt).toContain("grounded content from the Capture Layer");
    expect(prompt).toContain("Summary");
    expect(prompt).toContain("Recommendation");
  });

  it("leaves response_format schema unchanged in adapter contract", () => {
    const schema = JSON.parse(DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON);
    expect(schema).toMatchObject({
      type: "object",
      required: ["markdown", "decisionTrace"],
    });
  });

  it("does not receive markdown-only validator-aligned writing block", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "structured_response",
    });

    expect(prompt).not.toContain("Writing requirements (hard failures)");
    expect(prompt).not.toContain(
      "exactly one list item for every captureLayer.suggested_next_steps item",
    );
  });
});

describe("buildDecisionBriefPrompt markdown_only WebGPU experiment", () => {
  it("requests only markdown JSON without Decision Trace instructions", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "markdown_only",
    });

    expect(prompt).toContain("markdown:");
    expect(prompt).toContain("Do not include decisionTrace or any other top-level fields.");
    expect(prompt).not.toContain("Each decisionTrace.entries item");
    expect(prompt).not.toContain("Decision Trace");
  });

  it("requires every exact section heading as ## with non-empty content", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "markdown_only",
    });

    for (const section of DECISION_BRIEF_REQUIRED_SECTIONS) {
      expect(prompt).toContain(`## ${section}`);
    }

    expect(prompt).toContain("Start with exactly: # Decision Brief");
    expect(prompt).toContain("non-empty body content");
    expect(prompt).toContain("do not leave any section empty");
  });

  it("states validator-aligned writing hard requirements", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "markdown_only",
    });

    expect(prompt).toContain(`at most ${SUMMARY_MAX_WORDS} words`);
    expect(prompt).toContain(`at most ${SENTENCE_ERROR_WORDS} words`);
    expect(prompt).toContain("em dash");
    expect(prompt).toContain("Do not use emoji");
    expect(prompt).toContain("exclamation marks");

    for (const opener of BANNED_SENTENCE_OPENERS) {
      expect(prompt).toContain(`"${opener},"`);
    }

    for (const phrase of [...BANNED_CANNED_PHRASES, ...BANNED_CONSULTANT_FILLER]) {
      expect(prompt).toContain(`"${phrase}"`);
    }
  });

  it("requires recommendation preservation and explained confidence", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "markdown_only",
    });

    expect(prompt).toContain("captureLayer.recommendation_candidate");
    expect(prompt).toContain("Prefer beginning the Recommendation section with that exact text");
    expect(prompt).toContain("Do not replace it with a different recommendation thesis");
    expect(prompt).toContain("High, Medium, or Low plus a concise explanation");
    expect(prompt).toContain('Never output only a bare label such as "Confidence: High"');
  });

  it("requires exact next-step list alignment without extra prose", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "markdown_only",
    });

    expect(prompt).toContain(
      "exactly one list item for every captureLayer.suggested_next_steps item",
    );
    expect(prompt).toContain(
      "exactly the same number of list items as captureLayer.suggested_next_steps",
    );
    expect(prompt).toContain("only Markdown list items");
    expect(prompt).toContain("Do not add introductory prose");
    expect(prompt).toContain("invented steps");
  });

  it("prohibits instructional and placeholder leakage in output", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "markdown_only",
    });

    for (const forbidden of FORBIDDEN_WEBGPU_PROMPT_PLACEHOLDER_STRINGS) {
      expect(prompt).not.toContain(forbidden);
    }

    expect(prompt).toContain(
      "Do not copy instructional text, field descriptions, schema language, examples, or placeholders",
    );
  });

  it("uses a schema without Decision Trace fields", () => {
    const schema = JSON.parse(DECISION_BRIEF_MARKDOWN_ONLY_RESPONSE_SCHEMA_JSON);
    expect(schema).toMatchObject({
      type: "object",
      required: ["markdown"],
    });
    expect(schema.properties).not.toHaveProperty("decisionTrace");
  });

  it("does not leak validator-aligned requirements into structured_response", () => {
    const structuredPrompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "structured_response",
    });
    const markdownOnlyPrompt = buildDecisionBriefPrompt(baseBriefInput, {
      mode: "markdown_only",
    });

    expect(structuredPrompt).toContain("decisionTrace");
    expect(structuredPrompt).not.toContain(
      "exactly one list item for every captureLayer.suggested_next_steps item",
    );
    expect(structuredPrompt).not.toContain(`at most ${SUMMARY_MAX_WORDS} words`);
    expect(structuredPrompt).not.toContain("Writing requirements (hard failures)");
    expect(markdownOnlyPrompt).not.toContain("Each decisionTrace.entries item must include");
  });
});

describe("buildDecisionBriefPrompt legacy Ollama mode", () => {
  const previousVariant = process.env.VITE_CAPTURE_PROMPT_VARIANT;

  afterEach(() => {
    if (previousVariant === undefined) {
      delete process.env.VITE_CAPTURE_PROMPT_VARIANT;
    } else {
      process.env.VITE_CAPTURE_PROMPT_VARIANT = previousVariant;
    }
  });

  it("keeps the illustrative example schema shape", () => {
    const prompt = buildDecisionBriefPrompt(baseBriefInput);

    expect(prompt).toContain("Return a single JSON object with exactly this shape:");
    expect(prompt).toContain("The recommendation or next step, verbatim from the brief.");
    expect(prompt).toContain("Evidence item from the Capture Layer.");
  });

  it("defaults to legacy mode when no option is passed", () => {
    const explicitLegacy = buildDecisionBriefPrompt(baseBriefInput, { mode: "legacy" });
    const defaultPrompt = buildDecisionBriefPrompt(baseBriefInput);

    expect(defaultPrompt).toBe(explicitLegacy);
  });

  it("does not change capture prompt variant resolution", () => {
    delete process.env.VITE_CAPTURE_PROMPT_VARIANT;
    expect(resolveCapturePromptVariant("schema_skeleton")).toBe("schema_skeleton");
    expect(resolveCapturePromptVariant(undefined)).toBe("default");
  });
});

describe("detectDecisionBriefPlaceholderLeakage", () => {
  const leaked = createW3PlaceholderLeakedBriefResult();

  it("detects markdown placeholder text", () => {
    const findings = detectDecisionBriefPlaceholderLeakage(leaked);
    expect(
      findings.some((finding) => finding.fieldPath === "markdown"),
    ).toBe(true);
  });

  it("detects statement placeholder text", () => {
    const findings = detectDecisionBriefPlaceholderLeakage(leaked);
    expect(
      findings.some((finding) => finding.fieldPath.endsWith(".statement")),
    ).toBe(true);
  });

  it("detects intent placeholder text", () => {
    const findings = detectDecisionBriefPlaceholderLeakage(leaked);
    expect(
      findings.some((finding) => finding.fieldPath.endsWith(".basis.intent")),
    ).toBe(true);
  });

  it("detects each basis-array placeholder text", () => {
    const findings = detectDecisionBriefPlaceholderLeakage(leaked);
    const basisPaths = findings
      .map((finding) => finding.fieldPath)
      .filter((path) => path.includes(".basis."));

    expect(basisPaths.some((path) => path.includes("supporting_evidence"))).toBe(true);
    expect(basisPaths.some((path) => path.includes("assumptions_relied_on"))).toBe(true);
    expect(basisPaths.some((path) => path.includes("risks_addressed"))).toBe(true);
    expect(basisPaths.some((path) => path.includes("risks_accepted"))).toBe(true);
    expect(basisPaths.some((path) => path.includes("constraints_respected"))).toBe(true);
    expect(basisPaths.some((path) => path.includes("tradeoffs"))).toBe(true);
    expect(basisPaths.some((path) => path.includes("alternatives_considered"))).toBe(true);
    expect(basisPaths.some((path) => path.includes("missing_context_caveats"))).toBe(true);
  });

  it("detects would_change_if placeholder text", () => {
    const findings = detectDecisionBriefPlaceholderLeakage(leaked);
    expect(
      findings.some((finding) => finding.fieldPath.includes("would_change_if")),
    ).toBe(true);
  });

  it("detects case and punctuation variants", () => {
    const findings = detectDecisionBriefPlaceholderLeakage({
      markdown: "# Decision Brief\n\nTHE RECOMMENDATION OR NEXT STEP, VERBATIM FROM THE BRIEF.",
      decisionTrace: {
        entries: [],
        created_at: "1970-01-01T00:00:00.000Z",
      },
    });

    expect(findings.length).toBeGreaterThan(0);
  });

  it("passes grounded content", () => {
    const findings = detectDecisionBriefPlaceholderLeakage({
      markdown: Q4_BRIEF_MARKDOWN,
      decisionTrace: q4DecisionTrace,
    });

    expect(findings).toEqual([]);
  });
});
