import { useEffect, useMemo, useRef, useState } from "react";
import { formatAppVersionLabel } from "./appVersion";
import { WorkflowSetupBar } from "./components/WorkflowSetupBar";
import { BrowserInferenceStatus } from "./components/generation/BrowserInferenceStatus";
import { DownloadDisclosureDialog } from "./components/generation/DownloadDisclosureDialog";
import { GenerationRunStatus } from "./components/generation/GenerationRunStatus";
import {
  DEFAULT_DEMO_EXAMPLE_ID,
  DEMO_EXAMPLES,
  getDemoExample,
  getDemoExamplesForBriefType,
  type DemoExampleId,
} from "./data/demoExamples";
import { BRIEF_TYPES } from "./data/briefTypes";
import { useGenerationMode } from "./hooks/useGenerationMode";
import { useGenerationRunTelemetry } from "./hooks/useGenerationRunTelemetry";
import { useTimedStatusMessage } from "./hooks/useTimedStatusMessage";
import { generateCaptureLayerForSession } from "./services/generation/generateCaptureLayer";
import { generateDecisionBriefForSession } from "./services/generation/generateDecisionBrief";
import { getOllamaConfig } from "./services/generation/ollamaConfig";
import { GenerationCancelledError } from "./services/generation/webGpuErrors";
import type { BriefSession, BriefType, BriefTypeId } from "./types/brief";
import type { CaptureLayer } from "./types/captureLayer";
import {
  copyMarkdownToClipboard,
  downloadMarkdownFile,
  formatCopySuccessMessage,
  formatDownloadSuccessMessage,
  resolveDecisionBriefFilename,
} from "./utils/decisionBriefExport";

const BRIEF_TYPE_HINTS = {
  product:
    "Product focuses the brief on customer problems, workflows, features, and offering scope.",
  strategy:
    "Strategy focuses the brief on markets, positioning, investments, and tradeoffs.",
  execution:
    "Execution focuses the brief on rollout, resourcing, ownership, sequencing, and delivery.",
} satisfies Record<BriefTypeId, string>;

type PendingCaptureGenerate = {
  action: "capture";
  rawInputText: string;
  briefType: BriefType;
  sourceLabel?: string;
};

type PendingBriefGenerate = {
  action: "brief";
  captureLayer: CaptureLayer;
  briefType: BriefType;
  sourceLabel?: string;
};

type PendingGenerate = PendingCaptureGenerate | PendingBriefGenerate;

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
    errorStep: null,
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
    lastModelLoadDurationMs,
  } = generation;
  const isOllamaMode = effectiveMode === "ollama";
  const isWebGpuMode = effectiveMode === "webgpu";
  const ollamaTimeoutMs = isOllamaMode ? getOllamaConfig().timeoutMs : undefined;
  const telemetry = useGenerationRunTelemetry({
    runtimeMode: effectiveMode,
    configuredTimeoutMs: ollamaTimeoutMs,
  });
  const [briefSession, setBriefSession] = useState<BriefSession>(() =>
    createInitialSession(),
  );
  const { message: exportMessage, showMessage: showExportMessage, clearMessage: clearExportMessage } =
    useTimedStatusMessage();
  const [isBriefTypeHelpOpen, setIsBriefTypeHelpOpen] =
    useState<boolean>(false);
  const [selectedDemoExampleId, setSelectedDemoExampleId] =
    useState<DemoExampleId>(DEFAULT_DEMO_EXAMPLE_ID);
  const [pendingGenerate, setPendingGenerate] = useState<PendingGenerate | null>(
    null,
  );
  const pendingGenerateRef = useRef<PendingGenerate | null>(null);
  const lastModelLoadDurationRef = useRef<number | null>(null);

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
  const isWorkflowLocked =
    pendingGenerate !== null ||
    isGeneratingCaptureLayer ||
    isGeneratingDecisionBrief ||
    inferenceUiState === "downloading_model" ||
    isDisclosureOpen;
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
      : briefSession.errorStep === "capture"
        ? "Failed"
        : "Pending";
  const decisionBriefStatus = isGeneratingDecisionBrief
    ? "Generating"
    : briefSession.decisionBrief
      ? "Ready"
      : briefSession.errorStep === "brief"
        ? "Failed"
        : "Waiting";
  const captureErrorMessage =
    briefSession.errorStep === "capture" ? briefSession.errors[0] : null;
  const briefErrorMessage =
    briefSession.errorStep === "brief" ? briefSession.errors[0] : null;
  const generationStatusMessage =
    telemetry.liveStatusMessage ||
    (isWebGpuMode ? statusMessage : "");
  const showRunDetails =
    telemetry.enabled &&
    !isGeneratingCaptureLayer &&
    !isGeneratingDecisionBrief &&
    telemetry.currentStep === "idle";

  function updatePendingGenerate(next: PendingGenerate | null) {
    pendingGenerateRef.current = next;
    setPendingGenerate(next);
  }

  useEffect(() => {
    if (
      inferenceUiState === "download_cancelled" ||
      inferenceUiState === "download_failed"
    ) {
      updatePendingGenerate(null);
    }
  }, [inferenceUiState]);

  useEffect(() => {
    if (
      lastModelLoadDurationMs !== null &&
      lastModelLoadDurationMs !== lastModelLoadDurationRef.current
    ) {
      lastModelLoadDurationRef.current = lastModelLoadDurationMs;
      telemetry.completeModelLoad(lastModelLoadDurationMs);
    }
  }, [lastModelLoadDurationMs, telemetry]);

  function updateRawInput(text: string) {
    if (isWorkflowLocked) {
      return;
    }

    clearExportMessage();
    telemetry.resetRun();
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
      errorStep: null,
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleLoadDemoExample(exampleId: DemoExampleId = selectedDemoExampleId) {
    if (isWorkflowLocked) {
      return;
    }

    const example = getDemoExample(exampleId);
    if (!example) {
      return;
    }

    const now = new Date().toISOString();

    clearExportMessage();
    telemetry.resetRun();
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
      errorStep: null,
      updatedAt: now,
    }));
  }

  async function runCaptureGeneration(snapshot: PendingCaptureGenerate) {
    const abortController = isWebGpuMode ? beginGenerationAbort() : null;

    setBriefSession((currentSession) => ({
      ...currentSession,
      status: "generating_capture",
      errors: [],
      errorStep: null,
      updatedAt: new Date().toISOString(),
    }));
    telemetry.startCapture();
    notifyCaptureGenerationStarted();

    try {
      const captureLayer = await generateCaptureLayerForSession({
        rawInputText: snapshot.rawInputText,
        briefType: snapshot.briefType,
        sourceLabel: snapshot.sourceLabel,
        adapter: getAdapterForGeneration(abortController?.signal, {
          onCaptureRetry: () => {
            telemetry.recordCaptureRetry();
            notifyCaptureRetry();
          },
        }),
      });

      telemetry.completeCapture(null);

      setBriefSession((currentSession) => ({
        ...currentSession,
        captureLayer,
        decisionBrief: null,
        status: "capture_ready",
        errors: [],
        errorStep: null,
        updatedAt: new Date().toISOString(),
      }));
      notifyCaptureReady();
    } catch (error) {
      if (error instanceof GenerationCancelledError) {
        telemetry.completeCapture(error);
        setBriefSession((currentSession) => ({
          ...currentSession,
          status: "draft",
          errors: [],
          errorStep: null,
          updatedAt: new Date().toISOString(),
        }));
        cancelActiveGeneration();
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unable to generate Capture Layer.";

      telemetry.completeCapture(
        error instanceof Error ? error : new Error(message),
      );

      setBriefSession((currentSession) => ({
        ...currentSession,
        status: "error",
        errors: [message],
        errorStep: "capture",
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

  async function runBriefGeneration(snapshot: PendingBriefGenerate) {
    const abortController = isWebGpuMode ? beginGenerationAbort() : null;

    setBriefSession((currentSession) => ({
      ...currentSession,
      status: "generating_brief",
      errors: [],
      errorStep: null,
      updatedAt: new Date().toISOString(),
    }));
    telemetry.startBrief();
    notifyBriefGenerationStarted();

    try {
      const markdown = await generateDecisionBriefForSession({
        captureLayer: snapshot.captureLayer,
        briefType: snapshot.briefType,
        sourceLabel: snapshot.sourceLabel,
        adapter: getAdapterForGeneration(abortController?.signal, {
          onBriefRetry: () => {
            telemetry.recordBriefRetry();
          },
        }),
      });

      if (!markdown.trim()) {
        throw new Error("Decision Brief generation returned empty Markdown.");
      }

      const now = new Date().toISOString();

      telemetry.completeBrief(null);

      setBriefSession((currentSession) => ({
        ...currentSession,
        decisionBrief: {
          markdown,
          generatedFromCaptureLayer: currentSession.id,
          briefType: snapshot.briefType,
          editedByUser: false,
          createdAt: now,
          updatedAt: now,
        },
        status: "brief_ready",
        errors: [],
        errorStep: null,
        updatedAt: now,
      }));
      notifyGenerationComplete();
    } catch (error) {
      if (error instanceof GenerationCancelledError) {
        telemetry.completeBrief(error);
        setBriefSession((currentSession) => ({
          ...currentSession,
          status: "capture_ready",
          errors: [],
          errorStep: null,
          updatedAt: new Date().toISOString(),
        }));
        cancelActiveGeneration();
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unable to generate Decision Brief.";

      telemetry.completeBrief(
        error instanceof Error ? error : new Error(message),
      );

      setBriefSession((currentSession) => ({
        ...currentSession,
        status: "capture_ready",
        errors: [message],
        errorStep: "brief",
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

  async function handleGenerateCaptureLayer() {
    if (!briefSession.briefType || !canGenerateCaptureLayer) {
      return;
    }

    const snapshot: PendingCaptureGenerate = {
      action: "capture",
      rawInputText: briefSession.rawInput.text,
      briefType: briefSession.briefType,
      sourceLabel: briefSession.rawInput.sourceLabel,
    };

    if (isWebGpuMode && !isEngineReady) {
      updatePendingGenerate(snapshot);
      telemetry.startModelLoad();
      openDownloadDisclosure();
      return;
    }

    await runCaptureGeneration(snapshot);
  }

  async function handleGenerateDecisionBrief() {
    if (
      !briefSession.captureLayer ||
      !briefSession.briefType ||
      !canGenerateDecisionBrief
    ) {
      return;
    }

    const snapshot: PendingBriefGenerate = {
      action: "brief",
      captureLayer: briefSession.captureLayer,
      briefType: briefSession.briefType,
      sourceLabel: briefSession.rawInput.sourceLabel,
    };

    if (isWebGpuMode && !isEngineReady) {
      updatePendingGenerate(snapshot);
      telemetry.startModelLoad();
      openDownloadDisclosure();
      return;
    }

    await runBriefGeneration(snapshot);
  }

  useEffect(() => {
    if (!pendingGenerate || !isEngineReady || isDisclosureOpen) {
      return;
    }

    const nextPending = pendingGenerate;
    updatePendingGenerate(null);

    if (nextPending.action === "capture") {
      void runCaptureGeneration(nextPending);
      return;
    }

    void runBriefGeneration(nextPending);
  }, [pendingGenerate, isEngineReady, isDisclosureOpen]);

  function updateDecisionBriefMarkdown(markdown: string) {
    clearExportMessage();
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

    const result = await copyMarkdownToClipboard(currentMarkdown);
    if (result.ok) {
      showExportMessage(formatCopySuccessMessage(result.method));
      return;
    }

    showExportMessage(result.errorMessage);
  }

  function handleDownloadMarkdown() {
    if (!hasMarkdown) {
      return;
    }

    const filename = resolveDecisionBriefFilename({
      sourceLabel: briefSession.rawInput.sourceLabel,
      briefTypeId: selectedBriefTypeId,
    });
    const result = downloadMarkdownFile(currentMarkdown, filename);

    if (result.ok) {
      showExportMessage(formatDownloadSuccessMessage(result.filename));
      return;
    }

    showExportMessage(result.errorMessage);
  }

  function updateBriefType(briefTypeId: BriefTypeId) {
    if (isWorkflowLocked) {
      return;
    }

    const nextBriefType =
      BRIEF_TYPES.find((briefType) => briefType.id === briefTypeId) ?? null;
    const examplesForType = getDemoExamplesForBriefType(briefTypeId);
    const nextExampleId = examplesForType.some(
      (example) => example.id === selectedDemoExampleId,
    )
      ? selectedDemoExampleId
      : (examplesForType[0]?.id ?? selectedDemoExampleId);

    setSelectedDemoExampleId(nextExampleId);
    telemetry.resetRun();

    setBriefSession((currentSession) => ({
      ...currentSession,
      briefType: nextBriefType,
      captureLayer: null,
      decisionBrief: null,
      status: "draft",
      errors: [],
      errorStep: null,
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
            <span className="text-[10px] text-neutral-500">
              {formatAppVersionLabel()}
            </span>
            <span className="text-xs text-neutral-400">{modeLabel}</span>
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-200">
              {modeBadge}
            </span>
          </div>
        </header>

        <WorkflowSetupBar
          canSelectBrowserInference={canSelectBrowserInference}
          demoExamples={DEMO_EXAMPLES}
          effectiveMode={effectiveMode}
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
              className="min-h-0 flex-1 resize-none border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              disabled={isWorkflowLocked}
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
                      ? generationStatusMessage ||
                        (isOllamaMode
                          ? "Generating Capture Layer via Ollama..."
                          : isWebGpuMode
                            ? "Generating Capture Layer in your browser..."
                            : "Generating mocked Capture Layer...")
                      : "Capture Layer will appear here"
                  }
                />
              )}
            </div>
            {captureErrorMessage ? (
              <p className="mt-3 shrink-0 text-xs text-red-700">
                {captureErrorMessage}
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
                      ? generationStatusMessage ||
                        (isOllamaMode
                          ? "Generating Decision Brief via Ollama..."
                          : isWebGpuMode
                            ? "Generating Decision Brief in your browser..."
                            : "Generating mocked Decision Brief...")
                      : "Decision Brief will appear here"
                  }
                />
              )}
            </div>
            {briefErrorMessage ? (
              <p className="mt-3 shrink-0 text-xs text-red-700">
                {briefErrorMessage}
              </p>
            ) : null}
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
              title={
                hasMarkdown
                  ? "Copy the reviewed Decision Brief Markdown from the editor."
                  : "Generate a Decision Brief before copying."
              }
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
              title={
                hasMarkdown
                  ? "Download the reviewed Decision Brief Markdown from the editor."
                  : "Generate a Decision Brief before downloading."
              }
              type="button"
            >
              Download .md
            </button>
          </div>
        </footer>
        <GenerationRunStatus
          failureMessage={showRunDetails ? telemetry.failureMessage : ""}
          liveStatusMessage={
            isOllamaMode ? telemetry.liveStatusMessage : ""
          }
          runDetails={showRunDetails ? telemetry.runDetails : null}
        />
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
          statusMessage={
            telemetry.liveStatusMessage
              ? telemetry.liveStatusMessage
              : statusMessage
          }
        />
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-2 text-xs text-slate-600">
          {modeDescription}
        </div>
        {exportMessage ? (
          <div
            aria-live="polite"
            className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-xs text-slate-600"
            role="status"
          >
            {exportMessage}
          </div>
        ) : null}
        <DownloadDisclosureDialog
          isOpen={isDisclosureOpen}
          onCancel={() => {
            updatePendingGenerate(null);
            telemetry.cancelModelLoad();
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
