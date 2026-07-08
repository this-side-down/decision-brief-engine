import type { CaptureLayer } from "../types/captureLayer";
import type { BriefTypeId } from "../types/brief";
import householdMoveCaptureLayer from "../../fixtures/examples/household-move-planning/expected-capture-layer.json";
import householdMoveBrief from "../../fixtures/examples/household-move-planning/expected-decision-brief.md?raw";
import householdMoveMetadata from "../../fixtures/examples/household-move-planning/metadata.json";
import householdMoveNotes from "../../fixtures/examples/household-move-planning/messy-notes.md?raw";
import localInferenceCaptureLayer from "../../fixtures/examples/local-inference-setup-flow/expected-capture-layer.json";
import localInferenceBrief from "../../fixtures/examples/local-inference-setup-flow/expected-decision-brief.md?raw";
import localInferenceMetadata from "../../fixtures/examples/local-inference-setup-flow/metadata.json";
import localInferenceNotes from "../../fixtures/examples/local-inference-setup-flow/messy-notes.md?raw";
import q4WorkforceCaptureLayer from "../../fixtures/examples/q4-workforce-allocation/expected-capture-layer.json";
import q4WorkforceBrief from "../../fixtures/examples/q4-workforce-allocation/expected-decision-brief.md?raw";
import q4WorkforceMetadata from "../../fixtures/examples/q4-workforce-allocation/metadata.json";
import q4WorkforceNotes from "../../fixtures/examples/q4-workforce-allocation/messy-notes.md?raw";

export type DemoExampleId =
  | "q4-workforce-allocation"
  | "local-inference-setup-flow"
  | "household-move-planning";

export type ExampleFixtureMetadata = {
  id: DemoExampleId;
  title: string;
  briefTypeId: BriefTypeId;
  description: string;
  positioning: string[];
};

export type ExampleFixture = {
  metadata: ExampleFixtureMetadata;
  rawNotes: string;
  expectedCaptureLayer: CaptureLayer;
  expectedDecisionBrief: string;
};

const EXAMPLE_FIXTURE_ENTRIES: ExampleFixture[] = [
  {
    metadata: q4WorkforceMetadata as ExampleFixtureMetadata,
    rawNotes: q4WorkforceNotes.trim(),
    expectedCaptureLayer: q4WorkforceCaptureLayer as CaptureLayer,
    expectedDecisionBrief: q4WorkforceBrief.trim(),
  },
  {
    metadata: localInferenceMetadata as ExampleFixtureMetadata,
    rawNotes: localInferenceNotes.trim(),
    expectedCaptureLayer: localInferenceCaptureLayer as CaptureLayer,
    expectedDecisionBrief: localInferenceBrief.trim(),
  },
  {
    metadata: householdMoveMetadata as ExampleFixtureMetadata,
    rawNotes: householdMoveNotes.trim(),
    expectedCaptureLayer: householdMoveCaptureLayer as CaptureLayer,
    expectedDecisionBrief: householdMoveBrief.trim(),
  },
];

export const EXAMPLE_FIXTURES: ExampleFixture[] = EXAMPLE_FIXTURE_ENTRIES;

export const MOCK_CAPTURE_LAYERS_BY_EXAMPLE_ID = Object.fromEntries(
  EXAMPLE_FIXTURE_ENTRIES.map((fixture) => [
    fixture.metadata.id,
    fixture.expectedCaptureLayer,
  ]),
) as Record<DemoExampleId, CaptureLayer>;

export const MOCK_DECISION_BRIEFS_BY_EXAMPLE_ID = Object.fromEntries(
  EXAMPLE_FIXTURE_ENTRIES.map((fixture) => [
    fixture.metadata.id,
    fixture.expectedDecisionBrief,
  ]),
) as Record<DemoExampleId, string>;

export function getExampleFixture(
  exampleId: DemoExampleId,
): ExampleFixture | undefined {
  return EXAMPLE_FIXTURES.find((fixture) => fixture.metadata.id === exampleId);
}
