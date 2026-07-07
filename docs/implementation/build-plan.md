# MVP Implementation Build Plan

## 1. Purpose

This plan describes how to build the Decision Brief Engine MVP from the existing product, architecture, prompt, and evaluation docs.

The MVP should prove the core workflow: paste messy notes, select a brief type, generate a structured Capture Layer, generate a Markdown Decision Brief from the Capture Layer, review/edit the output, and export Markdown.

## 2. Build principles

- Build the UI shell and local state first.
- Add TypeScript types before complex UI.
- Keep Capture Layer JSON and Decision Brief Markdown as separate artifacts.
- Use mocked generation before real inference.
- Use a provider-neutral model adapter interface.
- Keep prompts, data contracts, and evaluation fixtures provider-neutral.
- Keep implementation compatible with local or self-hosted FOSS-compatible inference after license review.
- Do not select a final model during MVP scaffolding.
- Avoid auth, database persistence, integrations, collaboration, billing, enterprise admin, queues, background agents, and production deployment architecture.

## 3. MVP build sequence

1. Create the Vite, React, TypeScript, and Tailwind app shell.
2. Define TypeScript types for `BriefSession`, `RawInput`, `BriefType`, `CaptureLayer`, `DecisionBrief`, and `EvaluationCase`.
3. Add initial constants for the three brief types: product, strategy, and execution.
4. Build local/session state for one active `BriefSession`.
5. Build the Input Workspace for pasted notes.
6. Build the Brief Type Selector.
7. Add a mocked model adapter that returns fixture Capture Layer JSON.
8. Build Capture Layer generation flow using the mocked adapter.
9. Add a Capture Layer review/debug surface.
10. Add a mocked Decision Brief generator that returns Markdown from fixture or generated Capture Layer data.
11. Build the Review/Edit Surface for Markdown.
12. Add Markdown export via copy-to-clipboard or download-as-`.md`.
13. Add error states for invalid input, missing brief type, generation failure, malformed JSON, and empty Markdown.
14. Add evaluation fixtures/examples after the core pipeline works end to end.
15. Replace mocked generation with a local or self-hosted FOSS-compatible inference path behind the same adapter after license review.

## 4. Likely file/component structure

The exact structure can adapt to the app scaffold, but a simple MVP could use:

```text
src/
  app/
    App.tsx
  components/
    InputWorkspace.tsx
    BriefTypeSelector.tsx
    CaptureLayerPanel.tsx
    DecisionBriefEditor.tsx
    MarkdownExportControls.tsx
    ErrorMessage.tsx
  data/
    briefTypes.ts
    evaluationFixtures.ts
    mockGenerationFixtures.ts
  model/
    adapter.ts
    mockAdapter.ts
  prompts/
    captureLayerPrompt.ts
    decisionBriefPrompt.ts
  state/
    briefSessionState.ts
  types/
    brief.ts
    captureLayer.ts
    evaluation.ts
```

Keep files small and direct. Avoid adding routing, user accounts, global stores, persistence layers, or service infrastructure unless the MVP workflow requires them.

## 5. TypeScript state shape

The active MVP state should represent one `BriefSession`.

Suggested shape:

```ts
type BriefSessionStatus =
  | "draft"
  | "generating_capture"
  | "capture_ready"
  | "generating_brief"
  | "brief_ready"
  | "exported"
  | "error";

type BriefSessionState = {
  id: string;
  rawInput: RawInput;
  briefType: BriefType | null;
  captureLayer: CaptureLayer | null;
  decisionBrief: DecisionBrief | null;
  status: BriefSessionStatus;
  errors: string[];
  createdAt: string;
  updatedAt: string;
};
```

Implementation notes:

- `rawInput.text` is the pasted notes.
- `briefType` must be selected before generation.
- `captureLayer` stores structured JSON and should not be merged into `decisionBrief`.
- `decisionBrief.markdown` stores the editable Markdown artifact.
- Local/session state is enough for the MVP.

## 6. Prompt execution flow

The MVP prompt flow should follow the documented two-step AI pipeline:

1. Validate that raw notes are present and a brief type is selected.
2. Build Generate Capture Layer input from raw notes, selected brief type, brief type guidance, and required Capture Layer fields.
3. Call the model adapter.
4. Parse and validate structured Capture Layer JSON.
5. Store the Capture Layer separately in state.
6. Build Generate Decision Brief input from Capture Layer JSON, brief type, Markdown structure, and tone guidance.
7. Call the model adapter.
8. Store Markdown Decision Brief separately in state.
9. Let the user review/edit Markdown.
10. Export the current Markdown.

Capture Layer generation and Decision Brief generation must remain separate even when both calls are mocked.

## 7. Model adapter approach

Use a provider-neutral model adapter interface so the UI and prompt pipeline do not depend on one engine, model runner, inference engine, model, or provider API.

The model adapter should receive domain-level generation inputs that match the prompt contracts. UI components can call a higher-level generation function that fills stable constants from `briefTypes`, `captureLayerFields`, and the Markdown structure before invoking the adapter.

Suggested interface shape:

```ts
type BriefTypeGuidance = {
  whenToUse: string;
  commonInputs: string[];
  typicalDecisionShape: string;
  outputEmphasis: string[];
  exampleDecisionQuestions: string[];
};

type GenerateCaptureLayerInput = {
  rawInputText: string;
  briefType: BriefType;
  briefTypeGuidance: BriefTypeGuidance;
  captureLayerFields: string[];
  sourceLabel?: string;
};

type GenerateDecisionBriefInput = {
  captureLayer: CaptureLayer;
  briefType: BriefType;
  briefTypeGuidance: BriefTypeGuidance;
  markdownStructure: string[];
  toneGuidance?: string;
};

type ModelAdapter = {
  generateCaptureLayer(input: GenerateCaptureLayerInput): Promise<CaptureLayer>;
  generateDecisionBrief(input: GenerateDecisionBriefInput): Promise<string>;
};
```

The first adapter should be mocked. A local or self-hosted FOSS-compatible inference adapter can replace it later without changing UI state shape, prompt contracts, or component contracts.

## 8. Mocked generation approach

Mocked generation should be the first working path.

Use fixtures that:

- Return complete Capture Layer JSON with all required fields.
- Return Markdown Decision Brief output grounded in the fixture Capture Layer.
- Include at least one low-confidence or ambiguous case.
- Exercise product, strategy, and execution brief types.

Mock behavior should match the real adapter contract closely. Avoid test-only shapes that the real adapter will not support.

## 9. Markdown export behavior

Markdown export can start with either:

- Copy-to-clipboard.
- Download-as-`.md`.

Export should use the current reviewed/edited `decisionBrief.markdown`, not a regenerated value. The exported artifact should preserve headings, recommendation, risks, assumptions, open questions, next steps, and confidence.

## 10. Error states

Handle these MVP error states:

- Empty raw input.
- Missing brief type.
- Capture Layer generation failure.
- Malformed Capture Layer JSON.
- Missing required Capture Layer fields.
- Decision Brief generation failure.
- Empty Decision Brief Markdown.
- Export failure or unavailable clipboard API.

Errors should be user-visible and recoverable. Prefer clear retry paths over complex remediation workflows.

## 11. Evaluation fixture usage

Evaluation cases should become fixtures/examples only after the core pipeline exists.

Use fixtures to:

- Validate that mocked generation exercises the expected decision shapes.
- Compare Capture Layer JSON against required fields.
- Manually score output using `docs/ai/evaluation-plan.md`.
- Feed prompt and data contract changes back into docs when failures are found.

Do not add an automated eval runner for the MVP planning step.

## 12. Acceptable MVP shortcuts

- Single-screen workflow.
- In-memory or trivial browser/session state.
- Mocked generation fixtures.
- Basic text area for raw notes.
- Basic Markdown textarea or editor for review/edit.
- Copy-to-clipboard export before download support.
- Simple JSON display for Capture Layer review/debug.
- Minimal styling with Tailwind and simple accessible controls.

## 13. Explicit non-goals

- App code in this documentation task.
- New product features beyond the documented MVP.
- Authentication.
- Database persistence.
- Third-party integrations.
- Multi-user collaboration.
- Billing.
- Enterprise administration.
- Queues or background agents.
- Production deployment architecture.
- Hosted proprietary model APIs as the MVP path.
- Selecting a final model before license review.
- Automated evaluation runner.

## 14. First implementation PR sequence

Recommended first PRs:

1. Scaffold Vite, React, TypeScript, and Tailwind app.
2. Add core TypeScript types and brief type constants.
3. Build UI shell with local `BriefSession` state.
4. Add Input Workspace and Brief Type Selector.
5. Add mocked model adapter and Capture Layer generation.
6. Add Capture Layer review/debug surface.
7. Add mocked Decision Brief generation.
8. Add Review/Edit Surface and Markdown export.
9. Add evaluation fixtures/examples for manual scoring.
10. Add local or self-hosted FOSS-compatible inference adapter after license review.
