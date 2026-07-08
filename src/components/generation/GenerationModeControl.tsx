import type { BrowserInferenceUiState } from "../../hooks/useGenerationMode";
import type { UserGenerationModePreference } from "../../services/generation/generationMode";

type GenerationModeControlProps = {
  canSelectBrowserInference: boolean;
  modePreference: UserGenerationModePreference;
  preflightSupported: boolean;
  preflightReason?: string;
  inferenceUiState: BrowserInferenceUiState;
  onSelectMockDemo: () => void;
  onSelectLiveInBrowser: () => void;
  layout?: "bar" | "stacked";
};

function optionClassName(
  selected: boolean,
  disabled: boolean,
  layout: "bar" | "stacked",
) {
  const base =
    layout === "bar"
      ? "inline-flex min-w-0 cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm"
      : "flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded border px-3 py-2 text-sm";

  if (selected) {
    return `${base} border-neutral-950 bg-neutral-950 text-white`;
  }

  if (disabled) {
    return `${base} border-slate-200 bg-slate-100 text-slate-400`;
  }

  return `${base} border-slate-200 bg-white text-slate-700 hover:border-slate-400`;
}

export function GenerationModeControl({
  canSelectBrowserInference,
  modePreference,
  preflightSupported,
  preflightReason,
  inferenceUiState,
  onSelectMockDemo,
  onSelectLiveInBrowser,
  layout = "stacked",
}: GenerationModeControlProps) {
  if (!canSelectBrowserInference) {
    return null;
  }

  const liveDisabled =
    !preflightSupported || inferenceUiState === "browser_unsupported";
  const optionsLayoutClass =
    layout === "bar" ? "flex flex-wrap gap-2" : "mt-3 space-y-3";
  const fieldsetClass =
    layout === "bar"
      ? "min-w-0"
      : "min-w-0 shrink-0 rounded border border-slate-200 bg-slate-50 p-4";

  return (
    <fieldset className={fieldsetClass}>
      <legend
        className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
        id="generation-mode-legend"
      >
        Generation mode
      </legend>
      <div className={layout === "bar" ? "mt-2 flex flex-wrap gap-2" : optionsLayoutClass}>
        <label
          className={optionClassName(modePreference === "mock", false, layout)}
        >
          <input
            aria-labelledby="generation-mode-legend"
            checked={modePreference === "mock"}
            className="h-3.5 w-3.5 shrink-0 border-slate-300 text-neutral-950"
            name="generation-mode"
            onChange={onSelectMockDemo}
            type="radio"
          />
          <span className="min-w-0 whitespace-nowrap">Mock demo</span>
        </label>
        <label
          className={optionClassName(
            modePreference === "webgpu",
            liveDisabled,
            layout,
          )}
          title={
            liveDisabled
              ? preflightReason ??
                "This browser or device does not support WebGPU inference."
              : undefined
          }
        >
          <input
            aria-labelledby="generation-mode-legend"
            checked={modePreference === "webgpu"}
            className="h-3.5 w-3.5 shrink-0 border-slate-300 text-neutral-950"
            disabled={liveDisabled}
            name="generation-mode"
            onChange={() => {
              onSelectLiveInBrowser();
            }}
            type="radio"
          />
          <span className="min-w-0 whitespace-nowrap">Live in browser</span>
        </label>
      </div>
      {layout === "stacked" && !preflightSupported ? (
        <p className="mt-3 text-xs text-amber-800">
          Live in browser is not available here.{" "}
          {preflightReason ??
            "This browser or device does not support WebGPU inference."}
        </p>
      ) : layout === "stacked" ? (
        <p className="mt-3 text-xs text-slate-500">
          Live in browser downloads a model to this browser. Notes are processed
          locally and are not sent to a hosted inference API. Quality may be
          weaker than Local Ollama.
        </p>
      ) : !preflightSupported ? (
        <p className="mt-2 text-xs text-amber-800">
          Live in browser unavailable in this browser.
        </p>
      ) : null}
    </fieldset>
  );
}
