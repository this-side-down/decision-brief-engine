import type { GenerateCaptureLayerInput, GenerateDecisionBriefInput } from "./types";

const NO_REASONING_INSTRUCTION =
  "Do not include reasoning. Return only the final JSON object.";

export type CapturePromptVariant = "default" | "schema_skeleton";

function readCapturePromptVariantEnv(): string | undefined {
  const viteEnv = import.meta.env as ImportMetaEnv | undefined;
  const viteValue = viteEnv?.VITE_CAPTURE_PROMPT_VARIANT;
  if (typeof viteValue === "string" && viteValue.length > 0) {
    return viteValue;
  }

  const nodeProcess = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  const nodeValue = nodeProcess?.env?.VITE_CAPTURE_PROMPT_VARIANT;
  return typeof nodeValue === "string" && nodeValue.length > 0
    ? nodeValue
    : undefined;
}

export function resolveCapturePromptVariant(
  raw: string | undefined = readCapturePromptVariantEnv(),
): CapturePromptVariant {
  return raw === "schema_skeleton" ? "schema_skeleton" : "default";
}

function formatGuidance(guidance: GenerateCaptureLayerInput["briefTypeGuidance"]) {
  return [
    `When to use: ${guidance.whenToUse}`,
    `Common inputs: ${guidance.commonInputs.join("; ")}`,
    `Typical decision shape: ${guidance.typicalDecisionShape}`,
    `Output emphasis: ${guidance.outputEmphasis.join("; ")}`,
    `Example decision questions: ${guidance.exampleDecisionQuestions.join("; ")}`,
  ].join("\n");
}

function buildSchemaSkeletonBlock(fields: string[]): string {
  const skeleton: Record<string, string | string[]> = {};

  for (const field of fields) {
    if (field === "confidence") {
      skeleton[field] = "Low";
    } else if (
      field === "source_summary" ||
      field === "decision_context" ||
      field === "stated_decision" ||
      field === "implied_decision" ||
      field === "recommendation_candidate"
    ) {
      skeleton[field] = "";
    } else {
      skeleton[field] = [];
    }
  }

  return [
    "Return a single JSON object that includes every required field. Use this exact shape as a template (replace empty values with content from the notes; keep empty string/array when the source truly lacks the signal):",
    JSON.stringify(skeleton, null, 2),
    'stated_decision may be "" when the notes do not contain an explicit decision. Do not omit stated_decision or any other required field. confidence must be "High", "Medium", or "Low".',
  ].join("\n");
}

export function buildCaptureLayerPrompt(
  input: GenerateCaptureLayerInput,
  options: { variant?: CapturePromptVariant } = {},
): string {
  const variant = options.variant ?? resolveCapturePromptVariant();
  const sourceLabelLine = input.sourceLabel
    ? `Source label: ${input.sourceLabel}\n`
    : "";

  const shapeInstructions =
    variant === "schema_skeleton"
      ? [
          buildSchemaSkeletonBlock(input.captureLayerFields),
          "Use string values for text fields and arrays of strings for list fields.",
        ]
      : [
          "Return only valid JSON with all required fields. Use string values for text fields and arrays of strings for list fields. confidence must be High, Medium, or Low.",
        ];

  return [
    "You are a decision capture analyst. Your job is to convert messy source material into a structured Capture Layer that preserves facts, inference, ambiguity, missing context, tensions, and decision-relevant next steps. Do not write the final Decision Brief.",
    "",
    `Brief type: ${input.briefType.id}`,
    "Brief type guidance:",
    formatGuidance(input.briefTypeGuidance),
    "",
    "Required Capture Layer fields:",
    input.captureLayerFields.join(", "),
    "",
    ...shapeInstructions,
    "Separate stated facts from inference. Preserve ambiguity instead of flattening it. Do not invent missing facts.",
    NO_REASONING_INSTRUCTION,
    "",
    sourceLabelLine + "Raw input:",
    input.rawInputText,
  ].join("\n");
}

export type DecisionBriefPromptMode = "legacy" | "structured_response";

const DECISION_BRIEF_RESULT_SCHEMA = JSON.stringify(
  {
    markdown: "# Decision Brief\n[full Markdown brief here — newlines as \\n]",
    decisionTrace: {
      entries: [
        {
          statement: "The recommendation or next step, verbatim from the brief.",
          kind: "recommendation",
          basis: {
            intent: "Which goal from the Capture Layer this serves.",
            supporting_evidence: ["Evidence item from the Capture Layer."],
            assumptions_relied_on: ["Assumption from the Capture Layer this depends on."],
            risks_addressed: ["Risk from the Capture Layer this mitigates."],
            risks_accepted: ["Risk from the Capture Layer this accepts or defers."],
            constraints_respected: ["Constraint from the Capture Layer this stays within."],
            tradeoffs: ["Tradeoff or tension from the Capture Layer this navigates."],
            alternatives_considered: ["Alternative considered and why not selected."],
            missing_context_caveats: [
              "Missing context item that qualifies this entry's reliability.",
            ],
          },
          confidence: "Medium",
          would_change_if: ["Specific condition that would lead to a different outcome."],
        },
      ],
      created_at: new Date(0).toISOString(),
    },
  },
  null,
  2,
);

function buildDecisionBriefSharedRules(): string[] {
  return [
    "Decision Brief rules:",
    "- The markdown field must contain the complete Decision Brief Markdown as a JSON string value.",
    "- Start the markdown with # Decision Brief.",
    "- Use the Capture Layer as the source of truth. Do not reinterpret unsupported facts.",
    "",
    "Decision Trace rules:",
    "- Create one entry for each recommendation in the Decision Brief (kind: recommendation).",
    "- Create one entry for each suggested next step in the Decision Brief (kind: next_step).",
    '- kind must be exactly "recommendation" or "next_step".',
    '- confidence must be exactly "High", "Medium", or "Low".',
    "- statement must match the corresponding recommendation or next-step text in the markdown.",
    "- basis.intent must name a specific Capture Layer goal this entry serves. Must not be empty.",
    "- All basis fields must be present. At least one basis array must be non-empty.",
    "- Basis fields must be grounded in the Capture Layer. Do not invent facts not present in the Capture Layer.",
    "- would_change_if must contain at least one specific named condition per entry.",
    "- would_change_if must not contain generic placeholders such as 'if the situation changes', 'if new information becomes available', 'if circumstances change', or similar empty conditions.",
    "- If a recommendation cannot be fully supported from the Capture Layer, state that explicitly in missing_context_caveats.",
    "- Do not copy instructional text, field descriptions, or example placeholders into any output field.",
  ];
}

function buildStructuredDecisionBriefResponseInstructions(
  markdownStructure: string[],
): string {
  return [
    "Return a single JSON object with these top-level fields:",
    "- markdown: complete Decision Brief Markdown as a JSON string. Start with # Decision Brief.",
    "- decisionTrace: object with entries (array) and created_at (ISO-8601 timestamp).",
    "",
    "Required Decision Brief sections in markdown:",
    markdownStructure.map((section) => `- ${section}`).join("\n"),
    "- Confidence (include a Confidence section with High, Medium, or Low calibration)",
    "",
    "Each decisionTrace.entries item must include:",
    "- statement: exact wording of the recommendation or next step from the markdown",
    '- kind: exactly "recommendation" or "next_step"',
    "- basis: object with intent (string) and these string arrays: supporting_evidence, assumptions_relied_on, risks_addressed, risks_accepted, constraints_respected, tradeoffs, alternatives_considered, missing_context_caveats",
    '- confidence: exactly "High", "Medium", or "Low"',
    "- would_change_if: array with at least one specific named condition",
    "",
    "Populate every field with grounded content from the Capture Layer. Output values must be specific decision content, not field labels or instructions.",
  ].join("\n");
}

export function buildDecisionBriefPrompt(
  input: GenerateDecisionBriefInput,
  options: { mode?: DecisionBriefPromptMode } = {},
): string {
  const mode = options.mode ?? "legacy";
  const tone = input.toneGuidance ?? "Concise, executive-ready, direct, and decision-oriented.";

  const responseShapeBlock =
    mode === "structured_response"
      ? buildStructuredDecisionBriefResponseInstructions(input.markdownStructure)
      : ["Return a single JSON object with exactly this shape:", DECISION_BRIEF_RESULT_SCHEMA].join(
          "\n",
        );

  return [
    "You are a decision brief writer and rationale analyst. Your job is to turn a structured Capture Layer into two artifacts returned together in a single JSON object:",
    "1. A concise Markdown Decision Brief.",
    "2. A structured Decision Trace that makes each recommendation and next step traceable to the Capture Layer.",
    "",
    "Decision Trace is a user-facing structured rationale artifact. It is NOT raw model thinking, hidden reasoning, scratchpad output, or chain-of-thought.",
    "",
    `Brief type: ${input.briefType.id}`,
    "Brief type guidance:",
    formatGuidance(input.briefTypeGuidance),
    "",
    ...(mode === "legacy"
      ? [
          "Decision Brief sections to include:",
          input.markdownStructure.map((section) => `- ${section}`).join("\n"),
          "",
        ]
      : []),
    `Tone: ${tone}`,
    "",
    responseShapeBlock,
    "",
    ...buildDecisionBriefSharedRules(),
    NO_REASONING_INSTRUCTION,
    "",
    "Capture Layer JSON:",
    JSON.stringify(input.captureLayer, null, 2),
  ].join("\n");
}
