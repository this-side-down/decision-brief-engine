import { useMemo, useState } from "react";
import { BRIEF_TYPES } from "./data/briefTypes";
import { generateCaptureLayerForSession } from "./services/generation/generateCaptureLayer";
import { generateDecisionBriefForSession } from "./services/generation/generateDecisionBrief";
import type { BriefSession, BriefTypeId } from "./types/brief";
import type { CaptureLayer } from "./types/captureLayer";

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

function CaptureLayerSummary({ captureLayer }: { captureLayer: CaptureLayer }) {
  return (
    <div className="min-h-[32rem] border border-slate-200 bg-slate-50 p-4">
      <div className="space-y-4 text-sm">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Source Summary
          </h3>
          <p className="mt-2 leading-6 text-slate-700">
            {captureLayer.source_summary}
          </p>
        </div>
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Implied Decision
          </h3>
          <p className="mt-2 leading-6 text-slate-700">
            {captureLayer.implied_decision || "No implied decision captured."}
          </p>
        </div>
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Open Questions
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-700">
            {captureLayer.open_questions.slice(0, 2).map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3 text-xs text-slate-600">
          Confidence:{" "}
          <span className="font-semibold text-slate-900">
            {captureLayer.confidence}
          </span>
        </div>
      </div>
    </div>
  );
}

function DecisionBriefPreview({ markdown }: { markdown: string }) {
  return (
    <pre className="min-h-[32rem] whitespace-pre-wrap border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800">
      {markdown}
    </pre>
  );
}

export function App() {
  const [briefSession, setBriefSession] = useState<BriefSession>(() =>
    createInitialSession(),
  );

  const selectedBriefTypeId = useMemo(
    () => briefSession.briefType?.id ?? "",
    [briefSession.briefType],
  );
  const hasRawInput = briefSession.rawInput.text.trim().length > 0;
  const hasBriefType = briefSession.briefType !== null;
  const canGenerateCaptureLayer = hasRawInput && hasBriefType;
  const isGeneratingCaptureLayer =
    briefSession.status === "generating_capture";
  const canGenerateDecisionBrief = briefSession.captureLayer !== null;
  const isGeneratingDecisionBrief =
    briefSession.status === "generating_brief";
  const captureLayerStatus = isGeneratingCaptureLayer
    ? "Generating"
    : briefSession.captureLayer
      ? "Generated"
      : briefSession.status === "error"
        ? "Failed"
        : "Pending";
  const decisionBriefStatus = isGeneratingDecisionBrief
    ? "Generating"
    : briefSession.decisionBrief
      ? "Ready"
      : briefSession.status === "error"
        ? "Waiting"
        : "Waiting";

  function updateRawInput(text: string) {
    setBriefSession((currentSession) => ({
      ...currentSession,
      rawInput: {
        ...currentSession.rawInput,
        text,
      },
      updatedAt: new Date().toISOString(),
    }));
  }

  async function handleGenerateCaptureLayer() {
    if (!briefSession.briefType || !canGenerateCaptureLayer) {
      return;
    }

    setBriefSession((currentSession) => ({
      ...currentSession,
      status: "generating_capture",
      errors: [],
      updatedAt: new Date().toISOString(),
    }));

    try {
      const captureLayer = await generateCaptureLayerForSession({
        rawInputText: briefSession.rawInput.text,
        briefType: briefSession.briefType,
        sourceLabel: briefSession.rawInput.sourceLabel,
      });

      setBriefSession((currentSession) => ({
        ...currentSession,
        captureLayer,
        decisionBrief: null,
        status: "capture_ready",
        errors: [],
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      setBriefSession((currentSession) => ({
        ...currentSession,
        status: "error",
        errors: [
          error instanceof Error
            ? error.message
            : "Unable to generate Capture Layer.",
        ],
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  async function handleGenerateDecisionBrief() {
    if (
      !briefSession.captureLayer ||
      !briefSession.briefType ||
      !canGenerateDecisionBrief
    ) {
      return;
    }

    const selectedBriefType = briefSession.briefType;

    setBriefSession((currentSession) => ({
      ...currentSession,
      status: "generating_brief",
      errors: [],
      updatedAt: new Date().toISOString(),
    }));

    try {
      const markdown = await generateDecisionBriefForSession({
        captureLayer: briefSession.captureLayer,
        briefType: selectedBriefType,
      });

      if (!markdown.trim()) {
        throw new Error("Mock Decision Brief generation returned empty Markdown.");
      }

      const now = new Date().toISOString();

      setBriefSession((currentSession) => ({
        ...currentSession,
        decisionBrief: {
          markdown,
          generatedFromCaptureLayer: currentSession.id,
          briefType: selectedBriefType,
          editedByUser: false,
          createdAt: now,
          updatedAt: now,
        },
        status: "brief_ready",
        errors: [],
        updatedAt: now,
      }));
    } catch (error) {
      setBriefSession((currentSession) => ({
        ...currentSession,
        status: "error",
        errors: [
          error instanceof Error
            ? error.message
            : "Unable to generate Decision Brief.",
        ],
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  function updateBriefType(briefTypeId: BriefTypeId) {
    const nextBriefType =
      BRIEF_TYPES.find((briefType) => briefType.id === briefTypeId) ?? null;

    setBriefSession((currentSession) => ({
      ...currentSession,
      briefType: nextBriefType,
      updatedAt: new Date().toISOString(),
    }));
  }

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
              <textarea
                aria-describedby="raw-input-help"
                className="mt-4 min-h-72 w-full resize-none border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                onChange={(event) => updateRawInput(event.target.value)}
                placeholder="Paste meeting notes or brainstorms..."
                value={briefSession.rawInput.text}
              />
              <p
                className={`mt-2 text-xs ${
                  hasRawInput ? "text-slate-500" : "text-amber-700"
                }`}
                id="raw-input-help"
              >
                {hasRawInput
                  ? "Raw notes are stored locally for this session."
                  : "Paste messy notes before generating a Capture Layer."}
              </p>
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
                      name="brief-type"
                      onChange={() => updateBriefType(briefType.id)}
                      type="radio"
                    />
                    {briefType.name}
                  </label>
                ))}
              </div>
              <p
                className={`mt-3 text-xs ${
                  hasBriefType ? "text-slate-500" : "text-amber-700"
                }`}
              >
                {hasBriefType
                  ? `${briefSession.briefType?.name} selected.`
                  : "Select an MVP brief type before generation."}
              </p>
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
            </div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Mocked Capture Layer JSON stays separate from the Decision
                Brief.
              </span>
              <StatusBadge label={captureLayerStatus} />
            </div>
            {briefSession.captureLayer ? (
              <CaptureLayerSummary captureLayer={briefSession.captureLayer} />
            ) : (
              <EmptyPanel
                label={
                  isGeneratingCaptureLayer
                    ? "Generating mocked Capture Layer..."
                    : "Capture Layer will appear here"
                }
              />
            )}
            {briefSession.errors.length > 0 ? (
              <p className="mt-3 text-xs text-red-700">
                {briefSession.errors[0]}
              </p>
            ) : null}
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
              <StatusBadge label={decisionBriefStatus} />
            </div>
            {briefSession.decisionBrief ? (
              <DecisionBriefPreview markdown={briefSession.decisionBrief.markdown} />
            ) : (
              <EmptyPanel
                label={
                  isGeneratingDecisionBrief
                    ? "Generating mocked Decision Brief..."
                    : "Decision Brief will appear here"
                }
              />
            )}
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3">
          <div className="flex gap-3">
            <button
              className={`rounded border px-4 py-2 text-sm font-semibold transition ${
                canGenerateCaptureLayer
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-slate-200 bg-slate-100 text-slate-400"
              }`}
              disabled={!canGenerateCaptureLayer || isGeneratingCaptureLayer}
              onClick={handleGenerateCaptureLayer}
              title={
                canGenerateCaptureLayer
                  ? "Ready for the future Capture Layer generation step."
                  : "Add raw notes and select a brief type first."
              }
              type="button"
            >
              {isGeneratingCaptureLayer
                ? "Generating..."
                : "Generate Capture Layer"}
            </button>
            <button
              className={`rounded border px-4 py-2 text-sm font-semibold ${
                canGenerateDecisionBrief
                  ? "border-slate-300 bg-white text-slate-700"
                  : "border-slate-200 bg-slate-100 text-slate-400"
              }`}
              disabled={!canGenerateDecisionBrief || isGeneratingDecisionBrief}
              onClick={handleGenerateDecisionBrief}
              title={
                canGenerateDecisionBrief
                  ? "Generate mocked Decision Brief Markdown."
                  : "Generate a Capture Layer first."
              }
              type="button"
            >
              {isGeneratingDecisionBrief
                ? "Generating..."
                : "Generate Decision Brief"}
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
