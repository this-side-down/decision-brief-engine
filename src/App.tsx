import { useMemo, useState } from "react";
import { BRIEF_TYPES } from "./data/briefTypes";
import type { BriefSession } from "./types/brief";

function createInitialSession(): BriefSession {
  const now = new Date().toISOString();

  return {
    id: "local-session",
    rawInput: {
      text: "",
      createdAt: now,
    },
    briefType: null,
    captureLayer: null,
    decisionBrief: null,
    status: "draft",
    errors: [],
    createdAt: now,
    updatedAt: now,
  };
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </span>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[32rem] items-center justify-center border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
      {label}
    </div>
  );
}

export function App() {
  const [briefSession] = useState<BriefSession>(() => createInitialSession());

  const selectedBriefTypeId = useMemo(
    () => briefSession.briefType?.id ?? "",
    [briefSession.briefType],
  );

  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-slate-900">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-neutral-950 px-5 py-4 text-white">
          <div className="flex items-baseline gap-4">
            <h1 className="text-lg font-semibold tracking-tight">
              Decision Brief Engine
            </h1>
            <p className="text-xs text-neutral-400">
              Raw notes → structured decisions
            </p>
          </div>
          <span className="rounded-full bg-neutral-800 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-200">
            Demo
          </span>
        </header>

        <div className="grid flex-1 grid-cols-[minmax(16rem,1fr)_minmax(16rem,0.95fr)_minmax(24rem,2fr)] divide-x divide-slate-200">
          <section
            aria-labelledby="input-workspace-heading"
            className="flex flex-col gap-5 p-5"
          >
            <div>
              <h2
                className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
                id="input-workspace-heading"
              >
                Input Workspace
              </h2>
              <div className="mt-4 min-h-72 border border-slate-200 bg-white p-4 text-sm text-slate-400">
                Paste meeting notes or brainstorms...
              </div>
            </div>

            <fieldset>
              <legend className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Brief Type
              </legend>
              <div className="mt-3 space-y-3">
                {BRIEF_TYPES.map((briefType) => (
                  <label
                    className="flex items-center gap-3 text-sm text-slate-700"
                    key={briefType.id}
                  >
                    <input
                      checked={selectedBriefTypeId === briefType.id}
                      className="h-4 w-4 border-slate-300 text-neutral-950"
                      disabled
                      name="brief-type"
                      readOnly
                      type="radio"
                    />
                    {briefType.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section
            aria-labelledby="capture-layer-heading"
            className="flex flex-col p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
                id="capture-layer-heading"
              >
                Capture Layer
              </h2>
              <StatusBadge label="Pending" />
            </div>
            <EmptyPanel label="Capture Layer will appear here" />
          </section>

          <section
            aria-labelledby="decision-brief-heading"
            className="flex flex-col p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
                id="decision-brief-heading"
              >
                Decision Brief
              </h2>
              <StatusBadge label="Waiting" />
            </div>
            <EmptyPanel label="Decision Brief will appear here" />
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3">
          <div className="flex gap-3">
            <button
              className="rounded border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400"
              disabled
              type="button"
            >
              Generate Capture Layer
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              disabled
              type="button"
            >
              Generate Decision Brief
            </button>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded px-4 py-2 text-sm font-semibold text-slate-500"
              disabled
              type="button"
            >
              Copy Markdown
            </button>
            <button
              className="rounded px-4 py-2 text-sm font-semibold text-slate-500"
              disabled
              type="button"
            >
              Download .md
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
