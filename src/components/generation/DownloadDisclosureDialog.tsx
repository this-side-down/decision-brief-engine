import { getWebGpuModelDownloadSizeCopy } from "../../services/generation/webGpuConfig";

const REPOSITORY_URL = "https://github.com/this-side-down/decision-brief-engine";

type DownloadDisclosureDialogProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ApplicationFooter() {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 bg-slate-50 px-5 pb-2 pt-0 text-[10px] text-slate-400">
      <span>© 2026 Youssef Benchouaf</span>
      <span aria-hidden="true">·</span>
      <a
        aria-label="View Decision Brief Engine on GitHub"
        className="rounded text-slate-500 underline-offset-2 transition hover:text-slate-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/10"
        href={REPOSITORY_URL}
        rel="noreferrer"
        target="_blank"
      >
        GitHub
      </a>
    </footer>
  );
}

export function DownloadDisclosureDialog({
  isOpen,
  onConfirm,
  onCancel,
}: DownloadDisclosureDialogProps) {
  const downloadSizeCopy = getWebGpuModelDownloadSizeCopy();

  return (
    <>
      <ApplicationFooter />
      {isOpen ? (
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
                This experimental mode downloads about <strong>{downloadSizeCopy}</strong>{" "}
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
      ) : null}
    </>
  );
}
