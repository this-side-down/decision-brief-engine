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
};

export function GenerationModeControl({
  canSelectBrowserInference,
  modePreference,
  preflightSupported,
  preflightReason,
  inferenceUiState,
  onSelectMockDemo,
  onSelectLiveInBrowser,
}: GenerationModeControlProps) {
  if (!canSelectBrowserInference) {
    return null;
  }

  const liveDisabled =
    !preflightSupported || inferenceUiState === "browser_unsupported";

  return (
    <fieldset className="rounded border border-slate-200 bg-slate-50 p-4">
      <legend
        className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"
        id="generation-mode-legend"
      >
        Generation mode
      </legend>
      <div className="mt-3 space-y-3">
        <label
          className={`flex cursor-pointer items-center justify-between gap-3 rounded border px-3 py-2 text-sm ${
            modePreference === "mock"
              ? "border-neutral-950 bg-neutral-950 text-white"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          <span>Mock demo</span>
          <input
            aria-labelledby="generation-mode-legend"
            checked={modePreference === "mock"}
            className="h-4 w-4 border-slate-300 text-neutral-950"
            name="generation-mode"
            onChange={onSelectMockDemo}
            type="radio"
          />
        </label>
        <label
          className={`flex cursor-pointer items-center justify-between gap-3 rounded border px-3 py-2 text-sm ${
            modePreference === "webgpu"
              ? "border-neutral-950 bg-neutral-950 text-white"
              : liveDisabled
                ? "border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          <span>Live in browser</span>
          <input
            aria-labelledby="generation-mode-legend"
            checked={modePreference === "webgpu"}
            className="h-4 w-4 border-slate-300 text-neutral-950"
            disabled={liveDisabled}
            name="generation-mode"
            onChange={() => {
              onSelectLiveInBrowser();
            }}
            type="radio"
          />
        </label>
      </div>
      {!preflightSupported ? (
        <p className="mt-3 text-xs text-amber-800">
          Live in browser is not available here.{" "}
          {preflightReason ?? "This browser or device does not support WebGPU inference."}
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Live in browser downloads a model to this browser. Notes are processed locally
          and are not sent to a hosted inference API. Quality may be weaker than Local
          Ollama.
        </p>
      )}
    </fieldset>
  );
}
