import type { CaptureLayer } from "../types/captureLayer";
import type { BriefTypeId } from "../types/brief";
import type { DecisionTrace } from "../types/decisionTrace";
import platformRearchitectureCaptureLayer from "../../fixtures/examples/platform-rearchitecture-review/expected-capture-layer.json";
import platformRearchitectureBrief from "../../fixtures/examples/platform-rearchitecture-review/expected-decision-brief.md?raw";
import platformRearchitectureDecisionTrace from "../../fixtures/examples/platform-rearchitecture-review/expected-decision-trace.json";
import platformRearchitectureMetadata from "../../fixtures/examples/platform-rearchitecture-review/metadata.json";
import platformRearchitectureNotes from "../../fixtures/examples/platform-rearchitecture-review/messy-notes.md?raw";
import householdMoveCaptureLayer from "../../fixtures/examples/household-move-planning/expected-capture-layer.json";
import householdMoveBrief from "../../fixtures/examples/household-move-planning/expected-decision-brief.md?raw";
import householdMoveDecisionTrace from "../../fixtures/examples/household-move-planning/expected-decision-trace.json";
import householdMoveMetadata from "../../fixtures/examples/household-move-planning/metadata.json";
import householdMoveNotes from "../../fixtures/examples/household-move-planning/messy-notes.md?raw";
import localInferenceCaptureLayer from "../../fixtures/examples/local-inference-setup-flow/expected-capture-layer.json";
import localInferenceBrief from "../../fixtures/examples/local-inference-setup-flow/expected-decision-brief.md?raw";
import localInferenceDecisionTrace from "../../fixtures/examples/local-inference-setup-flow/expected-decision-trace.json";
import localInferenceMetadata from "../../fixtures/examples/local-inference-setup-flow/metadata.json";
import localInferenceNotes from "../../fixtures/examples/local-inference-setup-flow/messy-notes.md?raw";
import q4WorkforceCaptureLayer from "../../fixtures/examples/q4-workforce-allocation/expected-capture-layer.json";
import q4WorkforceBrief from "../../fixtures/examples/q4-workforce-allocation/expected-decision-brief.md?raw";
import q4WorkforceDecisionTrace from "../../fixtures/examples/q4-workforce-allocation/expected-decision-trace.json";
import q4WorkforceMetadata from "../../fixtures/examples/q4-workforce-allocation/metadata.json";
import q4WorkforceNotes from "../../fixtures/examples/q4-workforce-allocation/messy-notes.md?raw";

export type DemoExampleId =
  | "q4-workforce-allocation"
  | "local-inference-setup-flow"
  | "household-move-planning"
  | "platform-rearchitecture-review";

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
  expectedDecisionTrace: DecisionTrace;
};

const EXAMPLE_FIXTURE_ENTRIES: ExampleFixture[] = [
  {
    metadata: q4WorkforceMetadata as ExampleFixtureMetadata,
    rawNotes: q4WorkforceNotes.trim(),
    expectedCaptureLayer: q4WorkforceCaptureLayer as CaptureLayer,
    expectedDecisionBrief: q4WorkforceBrief.trim(),
    expectedDecisionTrace: q4WorkforceDecisionTrace as DecisionTrace,
  },
  {
    metadata: localInferenceMetadata as ExampleFixtureMetadata,
    rawNotes: localInferenceNotes.trim(),
    expectedCaptureLayer: localInferenceCaptureLayer as CaptureLayer,
    expectedDecisionBrief: localInferenceBrief.trim(),
    expectedDecisionTrace: localInferenceDecisionTrace as DecisionTrace,
  },
  {
    metadata: householdMoveMetadata as ExampleFixtureMetadata,
    rawNotes: householdMoveNotes.trim(),
    expectedCaptureLayer: householdMoveCaptureLayer as CaptureLayer,
    expectedDecisionBrief: householdMoveBrief.trim(),
    expectedDecisionTrace: householdMoveDecisionTrace as DecisionTrace,
  },
  {
    metadata: platformRearchitectureMetadata as ExampleFixtureMetadata,
    rawNotes: platformRearchitectureNotes.trim(),
    expectedCaptureLayer: platformRearchitectureCaptureLayer as CaptureLayer,
    expectedDecisionBrief: platformRearchitectureBrief.trim(),
    expectedDecisionTrace: platformRearchitectureDecisionTrace as DecisionTrace,
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

export const MOCK_DECISION_TRACES_BY_EXAMPLE_ID = Object.fromEntries(
  EXAMPLE_FIXTURE_ENTRIES.map((fixture) => [
    fixture.metadata.id,
    fixture.expectedDecisionTrace,
  ]),
) as Record<DemoExampleId, DecisionTrace>;

export function getExampleFixture(
  exampleId: DemoExampleId,
): ExampleFixture | undefined {
  return EXAMPLE_FIXTURES.find((fixture) => fixture.metadata.id === exampleId);
}
