import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getWebGpuModelDownloadSizeCopy } from "../../services/generation/webGpuConfig";

const WEBSITE_URL = "https://this-side-down.com";
const REPOSITORY_URL = "https://github.com/this-side-down/decision-brief-engine";
const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;

type DownloadDisclosureDialogProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ApplicationMetadata() {
  const [versionTarget, setVersionTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setVersionTarget(
      document.querySelector<HTMLElement>(
        "main > section > header > div:last-child > span:first-child",
      ),
    );
  }, []);

  if (!versionTarget) {
    return null;
  }

  return createPortal(
    <span className="whitespace-nowrap">
      <span aria-hidden="true"> · </span>
      <span>
        © 2026{" "}
        <a
          aria-label="Visit this-side-down"
          className="rounded text-neutral-300 underline-offset-2 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          href={WEBSITE_URL}
          rel="noreferrer"
          target="_blank"
        >
          this-side-down
        </a>
      </span>
      <span aria-hidden="true"> · </span>
      <a
        aria-label="View Decision Brief Engine on GitHub"
        className="rounded text-neutral-300 underline-offset-2 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        href={REPOSITORY_URL}
        rel="noreferrer"
        target="_blank"
      >
        GitHub
      </a>
      <span aria-hidden="true"> · </span>
      <a
        aria-label="View the Decision Brief Engine MIT license"
        className="rounded text-neutral-300 underline-offset-2 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        href={LICENSE_URL}
        rel="noreferrer"
        target="_blank"
      >
        MIT
      </a>
    </span>,
    versionTarget,
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
      <ApplicationMetadata />
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
