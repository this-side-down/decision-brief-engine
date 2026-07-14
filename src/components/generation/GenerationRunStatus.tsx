import { useEffect, useReducer, useRef } from "react";
import { DisclosureChevron } from "../DisclosureChevron";
import type { GenerationRunRecord } from "../../services/generation/generationRunTelemetry";
import {
  createRunDetailsDisclosureState,
  formatRunDetailsCollapsedSummary,
  isGenerationRunFailed,
  isGenerationRunTerminal,
  runDetailsDisclosureReducer,
} from "../../services/generation/runDetailsDisclosure";

type GenerationRunStatusProps = {
  liveStatusMessage?: string;
  failureMessage?: string;
  runDetails?: string[] | null;
  runRecord?: GenerationRunRecord | null;
  runGenerationId?: number;
};

export function GenerationRunStatus({
  liveStatusMessage,
  failureMessage,
  runDetails,
  runRecord,
  runGenerationId = 0,
}: GenerationRunStatusProps) {
  const [disclosureState, dispatchDisclosure] = useReducer(
    runDetailsDisclosureReducer,
    undefined,
    createRunDetailsDisclosureState,
  );
  const previousRunIdRef = useRef<number | null>(null);
  const previousTerminalRef = useRef(false);

  useEffect(() => {
    if (
      runGenerationId > 0 &&
      previousRunIdRef.current !== null &&
      runGenerationId !== previousRunIdRef.current
    ) {
      dispatchDisclosure({ type: "new_run_started" });
      previousTerminalRef.current = false;
    }

    previousRunIdRef.current = runGenerationId;
  }, [runGenerationId]);

  useEffect(() => {
    if (!runRecord || runGenerationId <= 0) {
      return;
    }

    const terminal = isGenerationRunTerminal(runRecord);
    const failed = isGenerationRunFailed(runRecord);

    if (terminal && !previousTerminalRef.current) {
      dispatchDisclosure({
        type: "run_completed",
        runId: runGenerationId,
        failed,
      });
    }

    previousTerminalRef.current = terminal;
  }, [runGenerationId, runRecord]);

  const hasLiveStatus = Boolean(liveStatusMessage);
  const hasFailure = Boolean(failureMessage);
  const hasRunDetails = Boolean(runDetails && runDetails.length > 0 && runRecord);

  if (!hasLiveStatus && !hasFailure && !hasRunDetails) {
    return null;
  }

  const collapsedSummary = runRecord
    ? formatRunDetailsCollapsedSummary(runRecord)
    : "";

  return (
    <div
      aria-live="polite"
      className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 text-sm text-slate-700"
      role="status"
    >
      {hasLiveStatus ? <p>{liveStatusMessage}</p> : null}
      {hasFailure ? (
        <p className={hasLiveStatus ? "mt-2 text-red-700" : "text-red-700"}>
          {failureMessage}
        </p>
      ) : null}
      {hasRunDetails ? (
        <div className={hasLiveStatus || hasFailure ? "mt-2" : undefined}>
          <button
            aria-controls="generation-run-details-panel"
            aria-expanded={disclosureState.expanded}
            className="flex w-full items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/10"
            onClick={() =>
              dispatchDisclosure({
                type: "toggle",
                runId: runGenerationId,
                expanded: !disclosureState.expanded,
              })
            }
            type="button"
          >
            <DisclosureChevron open={disclosureState.expanded} />
            <span className="min-w-0 flex-1">
              <span className="font-semibold uppercase tracking-wide text-slate-500">
                Run Details
              </span>
              {!disclosureState.expanded ? (
                <span className="text-slate-600">{` · ${collapsedSummary}`}</span>
              ) : null}
            </span>
          </button>
          {disclosureState.expanded ? (
            <div
              aria-label="Run details"
              className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              id="generation-run-details-panel"
              role="region"
            >
              <ul className="space-y-1">
                {runDetails?.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
