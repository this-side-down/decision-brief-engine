import type { BrowserInferenceUiState } from "../hooks/useGenerationMode";
import { BRIEF_TYPES } from "../data/briefTypes";
import type { DemoExample, DemoExampleId } from "../data/demoExamples";
import type { BriefTypeId } from "../types/brief";
import { GenerationModeControl } from "./generation/GenerationModeControl";
import type { UserGenerationModePreference } from "../services/generation/generationMode";
import {
  getWorkflowSetupCopy,
  type GenerationMode,
} from "../services/generation/generationMode";

const BRIEF_TYPE_LABELS = {
  product: "Product",
  strategy: "Strategy",
  execution: "Execution",
} satisfies Record<BriefTypeId, string>;

const BRIEF_TYPE_CONTEXT = {
  product:
    "Product: Feature, workflow, service, packaging, or customer-problem decisions.",
  strategy:
    "Strategy: Market, ICP, positioning, investment, or bet/no-bet decisions.",
  execution:
    "Execution: Rollout, resourcing, ownership, sequencing, or delivery-plan decisions.",
} satisfies Record<BriefTypeId, string>;

type WorkflowSetupBarProps = {
  selectedBriefTypeId: BriefTypeId | "";
  selectedBriefTypeHint: string;
  isBriefTypeHelpOpen: boolean;
  onBriefTypeHelpToggle: () => void;
  onBriefTypeChange: (briefTypeId: BriefTypeId) => void;
  demoExamples: DemoExample[];
  selectedDemoExampleId: DemoExampleId;
  selectedDemoExample: DemoExample;
  onDemoExampleChange: (exampleId: DemoExampleId) => void;
  onLoadDemoExample: () => void;
  canSelectBrowserInference: boolean;
  effectiveMode: GenerationMode;
  modePreference: UserGenerationModePreference;
  preflightSupported: boolean;
  preflightReason?: string;
  inferenceUiState: BrowserInferenceUiState;
  onSelectMockDemo: () => void;
  onSelectLiveInBrowser: () => void;
};

export function WorkflowSetupBar({
  selectedBriefTypeId,
  selectedBriefTypeHint,
  isBriefTypeHelpOpen,
  onBriefTypeHelpToggle,
  onBriefTypeChange,
  demoExamples,
  selectedDemoExampleId,
  selectedDemoExample,
  onDemoExampleChange,
  onLoadDemoExample,
  canSelectBrowserInference,
  effectiveMode,
  modePreference,
  preflightSupported,
  preflightReason,
  inferenceUiState,
  onSelectMockDemo,
  onSelectLiveInBrowser,
}: WorkflowSetupBarProps) {
  const setupCopy = getWorkflowSetupCopy(effectiveMode);

  return (
    <div
      aria-label="Workflow setup"
      className="shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-3"
    >
      <p className="text-xs text-slate-600">{setupCopy}</p>

      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <fieldset className="min-w-0">
          <div className="relative flex items-center gap-2">
            <legend className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Brief type
            </legend>
            <button
              aria-expanded={isBriefTypeHelpOpen}
              aria-label="Show brief type guidance"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] font-bold text-slate-500 hover:border-neutral-950 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
              onClick={onBriefTypeHelpToggle}
              type="button"
            >
              ?
            </button>
            {isBriefTypeHelpOpen ? (
              <div className="absolute left-0 top-7 z-30 w-80 max-w-[calc(100vw-4rem)] rounded border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700 shadow-lg">
                <ul className="space-y-2">
                  {BRIEF_TYPES.map((briefType) => (
                    <li key={briefType.id}>
                      {BRIEF_TYPE_CONTEXT[briefType.id]}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {BRIEF_TYPES.map((briefType) => (
              <label
                className={`inline-flex min-w-0 cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm ${
                  selectedBriefTypeId === briefType.id
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
                key={briefType.id}
              >
                <input
                  checked={selectedBriefTypeId === briefType.id}
                  className="h-3.5 w-3.5 shrink-0 border-slate-300 text-neutral-950"
                  name="brief-type"
                  onChange={() => onBriefTypeChange(briefType.id)}
                  type="radio"
                />
                <span className="whitespace-nowrap">
                  {BRIEF_TYPE_LABELS[briefType.id]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <GenerationModeControl
          canSelectBrowserInference={canSelectBrowserInference}
          inferenceUiState={inferenceUiState}
          layout="bar"
          modePreference={modePreference}
          onSelectLiveInBrowser={onSelectLiveInBrowser}
          onSelectMockDemo={onSelectMockDemo}
          preflightReason={preflightReason}
          preflightSupported={preflightSupported}
        />

        <div className="flex min-w-[12rem] flex-1 flex-col gap-1 sm:max-w-xs">
          <label
            className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
            htmlFor="demo-example-select"
          >
            Example scenario
          </label>
          <div className="flex gap-2">
            <select
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950/10"
              id="demo-example-select"
              onChange={(event) =>
                onDemoExampleChange(event.target.value as DemoExampleId)
              }
              value={selectedDemoExampleId}
            >
              {(["strategy", "product", "execution"] as const).map(
                (briefTypeId) => (
                  <optgroup
                    key={briefTypeId}
                    label={BRIEF_TYPE_LABELS[briefTypeId]}
                  >
                    {demoExamples
                      .filter((example) => example.briefTypeId === briefTypeId)
                      .map((example) => (
                        <option key={example.id} value={example.id}>
                          {example.title}
                        </option>
                      ))}
                  </optgroup>
                ),
              )}
            </select>
            <button
              className="shrink-0 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-neutral-950 hover:text-neutral-950"
              onClick={onLoadDemoExample}
              type="button"
            >
              Load
            </button>
          </div>
        </div>
      </div>

      <p
        className="mt-2 line-clamp-2 text-xs text-slate-500"
        title={`${selectedDemoExample.description} ${selectedBriefTypeHint}`}
      >
        <span className="font-medium text-slate-600">
          {selectedDemoExample.title}:
        </span>{" "}
        {selectedDemoExample.description} · {selectedBriefTypeHint}
      </p>
    </div>
  );
}
