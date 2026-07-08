import { WEBGPU_MODEL_DOWNLOAD_SIZE_COPY } from "../../services/generation/webGpuConfig";

type DownloadDisclosureDialogProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DownloadDisclosureDialog({
  isOpen,
  onConfirm,
  onCancel,
}: DownloadDisclosureDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="download-disclosure-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4"
      role="dialog"
    >
      <div className="max-w-lg rounded border border-slate-200 bg-white p-5 shadow-2xl">
        <h2
          className="text-lg font-semibold text-slate-900"
          id="download-disclosure-title"
        >
          Use live generation in your browser
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <p>
            This mode downloads about <strong>{WEBGPU_MODEL_DOWNLOAD_SIZE_COPY}</strong>{" "}
            of model data the first time you use it on this device and browser.
          </p>
          <p>
            After the first successful download, the model is cached locally in this
            browser. Repeat visits should not re-download unless you clear site data.
          </p>
          <p>
            Generation runs on your device using WebGPU. Your notes stay in the browser
            during inference.
          </p>
          <p>
            Decision Brief Engine does not send your notes to a hosted model API for this
            mode.
          </p>
          <p>
            Raw notes are not transmitted to Decision Brief Engine servers for generation.
          </p>
          <p>
            Output quality may be weaker than <strong>Local Ollama</strong> or manual
            editing. Browser inference is an early opt-in path.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-neutral-950 hover:text-neutral-950"
            onClick={onCancel}
            type="button"
          >
            Stay on Mock demo
          </button>
          <button
            className="rounded border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            onClick={onConfirm}
            type="button"
          >
            Download and continue
          </button>
        </div>
      </div>
    </div>
  );
}
