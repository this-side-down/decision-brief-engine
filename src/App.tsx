import { useMemo, useState } from "react";
import { WorkflowSetupBar } from "./components/WorkflowSetupBar";
import { BrowserInferenceStatus } from "./components/generation/BrowserInferenceStatus";
import { DownloadDisclosureDialog } from "./components/generation/DownloadDisclosureDialog";
import {
  DEFAULT_DEMO_EXAMPLE_ID,
  DEMO_EXAMPLES,
  getDemoExample,
  getDemoExamplesForBriefType,
  type DemoExampleId,
} from "./data/demoExamples";
import { BRIEF_TYPES } from "./data/briefTypes";
import { useGenerationMode } from "./hooks/useGenerationMode";
import { generateCaptureLayerForSession } from "./services/generation/generateCaptureLayer";
import { generateDecisionBriefForSession } from "./services/generation/generateDecisionBrief";
import { GenerationCancelledError } from "./services/generation/webGpuErrors";
import type { BriefSession, BriefTypeId } from "./types/brief";
import type { CaptureLayer } from "./types/captureLayer";

const BRIEF_TYPE_HINTS = {
  product:
    "Product focuses the brief on customer problems, workflows, features, and offering scope.",
  strategy:
    "Strategy focuses the brief on markets, positioning, investments, and tradeoffs.",
  execution:
    "Execution focuses the brief on rollout, resourcing, ownership, sequencing, and delivery.",
} satisfies Record<BriefTypeId, string>;

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
    <div className="flex min-h-48 flex-1 items-center justify-center border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
      {label}
    </div>
  );
}

function captureCardTextClassName() {
  return "mt-2 min-w-0 break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]";
}

function TextSection({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <section className="min-w-0 rounded border border-slate-200 bg-white p-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </h3>
      <p className={captureCardTextClassName()}>
        {value || "Not captured yet."}
      </p>
    </section>
  );
}

function ListSection({
  items,
  label,
}: {
  items: string[];
  label: string;
}) {
  return (
    <section className="min-w-0 rounded border border-slate-200 bg-white p-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </h3>
      {items.length > 0 ? (
        <ul className="mt-2 min-w-0 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-700">
          {items.map((item) => (
            <li className="break-words [overflow-wrap:anywhere]" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-400">Not captured yet.</p>
      )}
    </section>
  );
}

function CaptureLayerSummary({ captureLayer }: { captureLayer: CaptureLayer }) {
  return (
    <div className="min-w-0 space-y-3 border border-slate-200 bg-slate-50 p-4">
      <div className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-200 bg-white p-3 text-xs text-slate-600">
        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-500">
          Confidence
        </span>
        <span className="min-w-0 break-words text-right font-semibold text-slate-900 [overflow-wrap:anywhere]">
          {captureLayer.confidence}
        </span>
      </div>
      <TextSection label="Stated Decision" value={captureLayer.stated_decision} />
      <TextSection label="Implied Decision" value={captureLayer.implied_decision} />
      <TextSection
        label="Recommendation Candidate"
        value={captureLayer.recommendation_candidate}
      />
      <ListSection label="Missing Context" items={captureLayer.missing_context} />
      <ListSection label="Open Questions" items={captureLayer.open_questions} />
      <ListSection label="Assumptions" items={captureLayer.assumptions} />
      <ListSection label="Risks" items={captureLayer.risks} />
      <ListSection label="Constraints" items={captureLayer.constraints} />
      <ListSection
        label="Suggested Next Steps"
        items={captureLayer.suggested_next_steps}
      />
    </div>
  );
}

function DecisionBriefEditor({
  markdown,
  onChange,
}: {
  markdown: string;
  onChange: (markdown: string) => void;
}) {
  return (
    <textarea
      aria-label="Editable Decision Brief Markdown"
      className="min-h-0 w-full flex-1 resize-none border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
      onChange={(event) => onChange(event.target.value)}
      value={markdown}
    />
  );
}

export function App() {
  const generation = useGenerationMode();
  const {
    effectiveMode,
    modePreference,
    canSelectBrowserInference,
    modeLabel,
    modeBadge,
    modeDescription,
    preflight,
    inferenceUiState,
    statusMessage,
    downloadProgress,
    isDisclosureOpen,
    isEngineReady,
    selectMockDemo,
    selectLiveInBrowser,
    openDownloadDisclosure,
    closeDownloadDisclosure,
    confirmModelDownload,
    cancelModelDownload,
    retryModelDownload,
    fallbackToMockDemo,
    getAdapterForGeneration,
    beginGenerationAbort,
    endGenerationAbort,
    cancelActiveGeneration,
    notifyCaptureGenerationStarted,
    notifyCaptureRetry,
    notifyCaptureFailed,
    notifyCaptureReady,
    notifyBriefGenerationStarted,
    notifyBriefFailed,
    notifyGenerationComplete,
  } = generation;
  const isOllamaMode = effectiveMode === "ollama";
  const isWebGpuMode = effectiveMode === "webgpu";
  const [briefSession, setBriefSession] = useState<BriefSession>(() =>
    createInitialSession(),
  );
  const [exportMessage, setExportMessage] = useState<string>("");
  const [isBriefTypeHelpOpen, setIsBriefTypeHelpOpen] =
    useState<boolean>(false);
  const [selectedDemoExampleId, setSelectedDemoExampleId] =
    useState<DemoExampleId>(DEFAULT_DEMO_EXAMPLE_ID);

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
  const currentMarkdown = briefSession.decisionBrief?.markdown ?? "";
  const hasMarkdown = currentMarkdown.trim().length > 0;
  const selectedBriefTypeHint = briefSession.briefType
    ? BRIEF_TYPE_HINTS[briefSession.briefType.id]
    : "Select Product, Strategy, or Execution to shape the Capture Layer.";
  const selectedDemoExample = useMemo(
    () => getDemoExample(selectedDemoExampleId) ?? DEMO_EXAMPLES[0],
    [selectedDemoExampleId],
  );
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
    setExportMessage("");
    setBriefSession((currentSession) => ({
      ...currentSession,
      rawInput: {
        ...currentSession.rawInput,
        text,
      },
      captureLayer: null,
      decisionBrief: null,
      status: "draft",
      errors: [],
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleLoadDemoExample(exampleId: DemoExampleId = selectedDemoExampleId) {
    const example = getDemoExample(exampleId);
    if (!example) {
      return;
    }

    const now = new Date().toISOString();

    setExportMessage("");
    setSelectedDemoExampleId(example.id);
    setBriefSession((currentSession) => ({
      ...currentSession,
      rawInput: {
        text: example.rawNotes,
        sourceLabel: example.sourceLabel,
        createdAt: now,
      },
      briefType: example.briefType,
      captureLayer: null,
      decisionBrief: null,
      status: "draft",
      errors: [],
      updatedAt: now,
    }));
  }

  async function handleGenerateCaptureLayer() {
    if (!briefSession.briefType || !canGenerateCaptureLayer) {
      return;
    }

    if (isWebGpuMode && !isEngineReady) {
      openDownloadDisclosure();
      return;
    }

    const abortController = isWebGpuMode ? beginGenerationAbort() : null;

    setBriefSession((currentSession) => ({
      ...currentSession,
      status: "generating_capture",
      errors: [],
      updatedAt: new Date().toISOString(),
    }));
    notifyCaptureGenerationStarted();

    try {
      const captureLayer = await generateCaptureLayerForSession({
        rawInputText: briefSession.rawInput.text,
        briefType: briefSession.briefType,
        sourceLabel: briefSession.rawInput.sourceLabel,
        adapter: getAdapterForGeneration(
          abortController?.signal,
          notifyCaptureRetry,
        ),
      });

      setBriefSession((currentSession) => ({
        ...currentSession,
        captureLayer,
        decisionBrief: null,
        status: "capture_ready",
        errors: [],
        updatedAt: new Date().toISOString(),
      }));
      notifyCaptureReady();
    } catch (error) {
      if (error instanceof GenerationCancelledError) {
        setBriefSession((currentSession) => ({
          ...currentSession,
          status: "draft",
          errors: [],
          updatedAt: new Date().toISOString(),
        }));
        cancelActiveGeneration();
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unable to generate Capture Layer.";

      setBriefSession((currentSession) => ({
        ...currentSession,
        status: "error",
        errors: [message],
        updatedAt: new Date().toISOString(),
      }));
      notifyCaptureFailed(
        isWebGpuMode
          ? "Could not generate a valid Capture Layer. Your notes are unchanged."
          : message,
      );
    } finally {
      if (abortController) {
        endGenerationAbort();
      }
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

    if (isWebGpuMode && !isEngineReady) {
      openDownloadDisclosure();
      return;
    }

    const selectedBriefType = briefSession.briefType;
    const abortController = isWebGpuMode ? beginGenerationAbort() : null;

    setBriefSession((currentSession) => ({
      ...currentSession,
      status: "generating_brief",
      errors: [],
      updatedAt: new Date().toISOString(),
    }));
    notifyBriefGenerationStarted();

    try {
      const markdown = await generateDecisionBriefForSession({
        captureLayer: briefSession.captureLayer,
        briefType: selectedBriefType,
        sourceLabel: briefSession.rawInput.sourceLabel,
        adapter: getAdapterForGeneration(abortController?.signal),
      });

      if (!markdown.trim()) {
        throw new Error("Decision Brief generation returned empty Markdown.");
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
      notifyGenerationComplete();
    } catch (error) {
      if (error instanceof GenerationCancelledError) {
        setBriefSession((currentSession) => ({
          ...currentSession,
          status: "capture_ready",
          errors: [],
          updatedAt: new Date().toISOString(),
        }));
        cancelActiveGeneration();
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unable to generate Decision Brief.";

      setBriefSession((currentSession) => ({
        ...currentSession,
        status: "error",
        errors: [message],
        updatedAt: new Date().toISOString(),
      }));
      notifyBriefFailed(
        isWebGpuMode
          ? "Decision Brief generation failed. Your Capture Layer is preserved."
          : message,
      );
    } finally {
      if (abortController) {
        endGenerationAbort();
      }
    }
  }

  function updateDecisionBriefMarkdown(markdown: string) {
    setExportMessage("");
    setBriefSession((currentSession) => {
      if (!currentSession.decisionBrief) {
        return currentSession;
      }

      return {
        ...currentSession,
        decisionBrief: {
          ...currentSession.decisionBrief,
          markdown,
          editedByUser: true,
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function handleCopyMarkdown() {
    if (!hasMarkdown) {
      return;
    }

    try {
      await navigator.clipboard.writeText(currentMarkdown);
      setExportMessage("Markdown copied to clipboard.");
    } catch {
      setExportMessage("Unable to copy Markdown to clipboard.");
    }
  }

  function handleDownloadMarkdown() {
    if (!hasMarkdown) {
      return;
    }

    try {
      const blob = new Blob([currentMarkdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "decision-brief.md";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportMessage("Markdown download started.");
    } catch {
      setExportMessage("Unable to download Markdown.");
    }
  }

  function updateBriefType(briefTypeId: BriefTypeId) {
    const nextBriefType =
      BRIEF_TYPES.find((briefType) => briefType.id === briefTypeId) ?? null;
    const examplesForType = getDemoExamplesForBriefType(briefTypeId);
    const nextExampleId = examplesForType.some(
      (example) => example.id === selectedDemoExampleId,
    )
      ? selectedDemoExampleId
      : (examplesForType[0]?.id ?? selectedDemoExampleId);

    setSelectedDemoExampleId(nextExampleId);

    setBriefSession((currentSession) => ({
      ...currentSession,
      briefType: nextBriefType,
      captureLayer: null,
      decisionBrief: null,
      status: "draft",
      errors: [],
      updatedAt: new Date().toISOString(),
    }));
  }

  return (
    <main className="h-screen overflow-hidden bg-neutral-950 p-4 text-slate-900">
      <section className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between bg-neutral-950 px-5 py-4 text-white">
          <div className="flex items-baseline gap-4">
            <h1 className="text-lg font-semibold tracking-tight">
              Decision Brief Engine
            </h1>
            <p className="text-xs text-neutral-400">
              Raw notes → structured decisions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400">{modeLabel}</span>
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-200">
              {modeBadge}
            </span>
          </div>
        </header>

        <WorkflowSetupBar
          canSelectBrowserInference={canSelectBrowserInference}
          demoExamples={DEMO_EXAMPLES}
          inferenceUiState={inferenceUiState}
          isBriefTypeHelpOpen={isBriefTypeHelpOpen}
          modePreference={modePreference}
          onBriefTypeChange={updateBriefType}
          onBriefTypeHelpToggle={() =>
            setIsBriefTypeHelpOpen((isOpen) => !isOpen)
          }
          onDemoExampleChange={setSelectedDemoExampleId}
          onLoadDemoExample={() => handleLoadDemoExample()}
          onSelectLiveInBrowser={selectLiveInBrowser}
          onSelectMockDemo={selectMockDemo}
          preflightReason={preflight.reason}
          preflightSupported={preflight.supported}
          selectedBriefTypeHint={selectedBriefTypeHint}
          selectedBriefTypeId={selectedBriefTypeId}
          selectedDemoExample={selectedDemoExample}
          selectedDemoExampleId={selectedDemoExampleId}
        />

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.95fr)_minmax(18rem,2fr)] divide-x divide-slate-200 overflow-hidden xl:grid-cols-[minmax(16rem,1fr)_minmax(16rem,0.95fr)_minmax(24rem,2fr)]">
          <section
            aria-labelledby="input-workspace-heading"
            className="flex min-h-0 min-w-0 flex-col overflow-hidden p-5"
          >
            <div className="mb-3 shrink-0">
              <h2
                className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
                id="input-workspace-heading"
              >
                Input Workspace
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                Paste messy meeting notes for Capture Layer generation. Load a
                demo example from the setup bar above.
              </p>
            </div>
            <textarea
              aria-describedby="raw-input-help"
              className="min-h-0 flex-1 resize-none border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              onChange={(event) => updateRawInput(event.target.value)}
              placeholder="Paste meeting notes or brainstorms..."
              value={briefSession.rawInput.text}
            />
            <p
              className={`mt-2 shrink-0 text-xs ${
                hasRawInput ? "text-slate-500" : "text-amber-700"
              }`}
              id="raw-input-help"
            >
              {hasRawInput
                ? "Raw notes are stored locally for this session."
                : "Paste messy notes before generating a Capture Layer."}
            </p>
          </section>

          <section
            aria-labelledby="capture-layer-heading"
            className="flex min-h-0 min-w-0 flex-col overflow-hidden p-5"
          >
            <div className="mb-4 shrink-0">
              <div className="flex items-center justify-between">
                <h2
                  className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
                  id="capture-layer-heading"
                >
                  Capture Layer
                </h2>
                <StatusBadge label={captureLayerStatus} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Structured capture artifact: preserves facts, inference, and
                ambiguity before the final brief—not a summary shortcut.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {briefSession.captureLayer ? (
                <CaptureLayerSummary captureLayer={briefSession.captureLayer} />
              ) : (
                <EmptyPanel
                  label={
                    isGeneratingCaptureLayer
                      ? isOllamaMode
                        ? "Generating Capture Layer via Ollama..."
                        : isWebGpuMode
                          ? "Generating Capture Layer in your browser..."
                          : "Generating mocked Capture Layer..."
                      : "Capture Layer will appear here"
                  }
                />
              )}
            </div>
            {briefSession.errors.length > 0 ? (
              <p className="mt-3 shrink-0 text-xs text-red-700">
                {briefSession.errors[0]}
              </p>
            ) : null}
          </section>

          <section
            aria-labelledby="decision-brief-heading"
            className="flex min-h-0 min-w-0 flex-col overflow-hidden p-5"
          >
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2
                className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
                id="decision-brief-heading"
              >
                Decision Brief
              </h2>
              <StatusBadge label={decisionBriefStatus} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              {briefSession.decisionBrief ? (
                <DecisionBriefEditor
                  markdown={briefSession.decisionBrief.markdown}
                  onChange={updateDecisionBriefMarkdown}
                />
              ) : (
                <EmptyPanel
                  label={
                    isGeneratingDecisionBrief
                      ? isOllamaMode
                        ? "Generating Decision Brief via Ollama..."
                        : isWebGpuMode
                          ? "Generating Decision Brief in your browser..."
                          : "Generating mocked Decision Brief..."
                      : "Decision Brief will appear here"
                  }
                />
              )}
            </div>
          </section>
        </div>

        <footer className="sticky bottom-0 z-20 flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
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
                  ? isOllamaMode
                    ? "Generate Decision Brief Markdown via Ollama."
                    : isWebGpuMode
                      ? "Generate Decision Brief Markdown in your browser."
                      : "Generate mocked Decision Brief Markdown."
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
              className={`rounded px-4 py-2 text-sm font-semibold ${
                hasMarkdown ? "text-slate-900" : "text-slate-500"
              }`}
              disabled={!hasMarkdown}
              onClick={handleCopyMarkdown}
              type="button"
            >
              Copy Markdown
            </button>
            <button
              className={`rounded px-4 py-2 text-sm font-semibold ${
                hasMarkdown ? "text-slate-900" : "text-slate-500"
              }`}
              disabled={!hasMarkdown}
              onClick={handleDownloadMarkdown}
              type="button"
            >
              Download .md
            </button>
          </div>
        </footer>
        <BrowserInferenceStatus
          downloadProgress={downloadProgress}
          inferenceUiState={inferenceUiState}
          onCancelDownload={cancelModelDownload}
          onCancelGeneration={cancelActiveGeneration}
          onRetryDownload={retryModelDownload}
          onStayOnMockDemo={fallbackToMockDemo}
          onTryAgain={
            inferenceUiState === "capture_failed"
              ? handleGenerateCaptureLayer
              : inferenceUiState === "brief_failed"
                ? handleGenerateDecisionBrief
                : undefined
          }
          onUseMockDemo={fallbackToMockDemo}
          statusMessage={statusMessage}
        />
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-2 text-xs text-slate-600">
          {modeDescription}
        </div>
        {exportMessage ? (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-xs text-slate-600">
            {exportMessage}
          </div>
        ) : null}
        <DownloadDisclosureDialog
          isOpen={isDisclosureOpen}
          onCancel={() => {
            closeDownloadDisclosure();
            if (!isEngineReady) {
              selectMockDemo();
            }
          }}
          onConfirm={confirmModelDownload}
        />
      </section>
    </main>
  );
}
