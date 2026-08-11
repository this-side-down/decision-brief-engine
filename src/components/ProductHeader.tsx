const REPOSITORY_URL =
  "https://github.com/this-side-down/decision-brief-engine";
const WEBSITE_URL = "https://this-side-down.com";
const HEADER_LINK_CLASS_NAME =
  "rounded text-neutral-300 underline-offset-2 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

function ProductMark() {
  return (
    <svg aria-hidden="true" className="h-7 w-7 shrink-0" viewBox="0 0 32 32">
      <rect fill="#F4F1EA" height="32" width="32" />
      <path
        d="M8 6h12l4 4v16H8V6Z"
        fill="none"
        stroke="#131312"
        strokeWidth="2"
      />
      <path d="M20 6v5h5" fill="none" stroke="#131312" strokeWidth="2" />
      <path d="M12 16h8M12 20h6" stroke="#7A6CC4" strokeWidth="2" />
    </svg>
  );
}

function BuildDetails({ runtimeDescription }: { runtimeDescription: string }) {
  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none rounded border border-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 transition hover:border-neutral-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden">
        Build details
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-[min(28rem,calc(100vw-1.5rem))] border border-slate-300 bg-[#F4F1EA] p-4 text-slate-800 shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B5EAA]">
          Inspectable by design
        </p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">
          How this build works
        </h2>
        <dl className="mt-4 space-y-3 text-xs leading-5">
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-500">
              Runtime
            </dt>
            <dd className="mt-1 text-slate-700">{runtimeDescription}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-500">
              Data boundary
            </dt>
            <dd className="mt-1 text-slate-700">
              DBE does not automatically persist decision content; it remains
              in session memory unless you download the Markdown. The selected
              generation mode is stored locally, and opt-in WebGPU model files
              may be cached by the browser. There is no hosted app backend,
              account, hosted analytics, or server-side decision storage.
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-500">
              Decision pipeline
            </dt>
            <dd className="mt-1 text-slate-700">
              Source notes become a visible Capture Layer, a source-bound
              Decision Trace, and editable Markdown. Hidden model reasoning is
              neither shown nor stored.
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-500">
              Build system
            </dt>
            <dd className="mt-1 text-slate-700">
              React 19, TypeScript 6, Vite 8, and Tailwind 4. Human-directed,
              AI-assisted, and reviewed through public issues and pull requests.
            </dd>
          </div>
        </dl>
        <nav aria-label="Build documentation" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-300 pt-3 text-xs font-semibold">
          <a
            className="text-[#5B4F9A] underline decoration-[#B9AFE0] underline-offset-2 hover:decoration-[#5B4F9A]"
            href={REPOSITORY_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            Source
          </a>
          <a
            className="text-[#5B4F9A] underline decoration-[#B9AFE0] underline-offset-2 hover:decoration-[#5B4F9A]"
            href={`${REPOSITORY_URL}/blob/main/docs/architecture/mvp-architecture.md`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Architecture
          </a>
          <a
            className="text-[#5B4F9A] underline decoration-[#B9AFE0] underline-offset-2 hover:decoration-[#5B4F9A]"
            href={`${REPOSITORY_URL}/blob/main/docs/project/ai-native-development.md`}
            rel="noopener noreferrer"
            target="_blank"
          >
            AI-native workflow
          </a>
          <a
            className="text-[#5B4F9A] underline decoration-[#B9AFE0] underline-offset-2 hover:decoration-[#5B4F9A]"
            href={`${REPOSITORY_URL}/blob/main/LICENSE`}
            rel="noopener noreferrer"
            target="_blank"
          >
            MIT license
          </a>
        </nav>
      </div>
    </details>
  );
}

function PublicMetadata({ versionLabel }: { versionLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-[10px] text-neutral-500">
      <span>{versionLabel}</span>
      <span aria-hidden="true">·</span>
      <span>
        © 2026{" "}
        <a
          aria-label="Visit this-side-down"
          className={HEADER_LINK_CLASS_NAME}
          href={WEBSITE_URL}
          rel="noreferrer"
          target="_blank"
        >
          this-side-down
        </a>
      </span>
      <span aria-hidden="true">·</span>
      <a
        aria-label="View Decision Brief Engine on GitHub"
        className={HEADER_LINK_CLASS_NAME}
        href={REPOSITORY_URL}
        rel="noreferrer"
        target="_blank"
      >
        GitHub
      </a>
      <span aria-hidden="true">·</span>
      <a
        aria-label="View the Decision Brief Engine MIT license"
        className={HEADER_LINK_CLASS_NAME}
        href={`${REPOSITORY_URL}/blob/main/LICENSE`}
        rel="noreferrer"
        target="_blank"
      >
        MIT
      </a>
    </div>
  );
}

export function ProductHeader({
  versionLabel,
  modeLabel,
  modeBadge,
  runtimeDescription,
}: {
  versionLabel: string;
  modeLabel: string;
  modeBadge: string;
  runtimeDescription: string;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-neutral-950 px-4 py-3.5 text-white sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <ProductMark />
        <div className="flex min-w-0 items-baseline gap-4">
          <h1 className="truncate text-base font-semibold tracking-[-0.02em] sm:text-lg">
            Decision Brief Engine
          </h1>
          <p className="hidden text-xs text-neutral-400 md:block">
            Raw notes to structured decisions
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <PublicMetadata versionLabel={versionLabel} />
        <span className="hidden text-xs text-neutral-400 sm:inline">{modeLabel}</span>
        <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-200 sm:px-3">
          {modeBadge}
        </span>
        <BuildDetails runtimeDescription={runtimeDescription} />
      </div>
    </header>
  );
}
