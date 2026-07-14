import { GenerationCancelledError } from "../services/generation/webGpuErrors";
import type { BriefSession, BriefType } from "../types/brief";
import type { DecisionTrace } from "../types/decisionTrace";
import {
  beginBriefGenerationRun,
  isBriefGenerationRunCurrent,
  supersedeBriefGenerationRun,
} from "./briefGenerationRunGuard";

export type BriefGenerationResult = {
  markdown: string;
  decisionTrace: DecisionTrace | null;
};

export type BriefGenerationSessionUpdater = (
  updater: (session: BriefSession) => BriefSession,
) => void;

export type BriefRunIdController = {
  getActiveRunId: () => number;
  setActiveRunId: (runId: number) => void;
};

export type BriefCancellationDeps = BriefRunIdController & {
  setSession: BriefGenerationSessionUpdater;
  completeTelemetry: (error: Error | null) => void;
  cancelActiveGeneration: () => void;
};

export type BriefGenerationLifecycleDeps = BriefCancellationDeps & {
  startTelemetry: () => void;
  notifyStarted: () => void;
  notifyFailed: (error: unknown, message: string) => void;
  notifyComplete: () => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function resolveBriefGenerationStartSession(
  session: BriefSession,
): BriefSession {
  return {
    ...session,
    status: "generating_brief",
    decisionTrace: null,
    decisionBrief: null,
    errors: [],
    errorStep: null,
    updatedAt: nowIso(),
  };
}

export function resolveBriefGenerationSuccessSession(
  session: BriefSession,
  result: BriefGenerationResult,
  briefType: BriefType,
): BriefSession {
  const now = nowIso();

  return {
    ...session,
    decisionTrace: result.decisionTrace,
    decisionBrief: {
      markdown: result.markdown,
      generatedFromCaptureLayer: session.id,
      briefType,
      editedByUser: false,
      createdAt: now,
      updatedAt: now,
    },
    status: "brief_ready",
    errors: [],
    errorStep: null,
    updatedAt: now,
  };
}

export function resolveBriefGenerationFailureSession(
  session: BriefSession,
  message: string,
): BriefSession {
  return {
    ...session,
    status: "capture_ready",
    errors: [message],
    errorStep: "brief",
    updatedAt: nowIso(),
  };
}

/**
 * The terminal state a brief-generation session must reach the instant the
 * user cancels. Preserves the accepted Capture Layer, drops any in-flight
 * brief/trace, and returns the workflow to a re-generatable state.
 */
export function resolveBriefCancellationSession(
  session: BriefSession,
): BriefSession {
  return {
    ...session,
    decisionBrief: null,
    decisionTrace: null,
    status: "capture_ready",
    errors: [],
    errorStep: null,
    updatedAt: nowIso(),
  };
}

/**
 * Cancel an in-flight Decision Brief generation.
 *
 * This must run synchronously and unconditionally: it supersedes the active
 * run (so a late success or rejection from the in-flight request cannot
 * publish artifacts or re-complete telemetry), completes brief telemetry as
 * a cancellation exactly once, establishes `capture_ready` as the terminal
 * session state, and aborts the underlying request.
 */
export function cancelBriefGeneration(deps: BriefCancellationDeps): void {
  deps.setActiveRunId(supersedeBriefGenerationRun(deps.getActiveRunId()));
  deps.completeTelemetry(new GenerationCancelledError());
  deps.setSession(resolveBriefCancellationSession);
  deps.cancelActiveGeneration();
}

/**
 * Run a single Decision Brief generation attempt end to end, applying the
 * run-id guard so a stale success or failure (one whose run was superseded
 * by cancellation) cannot alter session state or complete telemetry a
 * second time.
 */
export async function runBriefGenerationLifecycle(
  generate: () => Promise<BriefGenerationResult>,
  briefType: BriefType,
  deps: BriefGenerationLifecycleDeps,
): Promise<void> {
  const { runId, nextActiveRunId } = beginBriefGenerationRun(
    deps.getActiveRunId(),
  );
  deps.setActiveRunId(nextActiveRunId);

  deps.setSession(resolveBriefGenerationStartSession);
  deps.startTelemetry();
  deps.notifyStarted();

  try {
    const result = await generate();

    if (!isBriefGenerationRunCurrent(deps.getActiveRunId(), runId)) {
      return;
    }

    if (!result.markdown.trim()) {
      throw new Error("Decision Brief generation returned empty Markdown.");
    }

    deps.completeTelemetry(null);
    deps.setSession((session) =>
      resolveBriefGenerationSuccessSession(session, result, briefType),
    );
    deps.notifyComplete();
  } catch (error) {
    if (!isBriefGenerationRunCurrent(deps.getActiveRunId(), runId)) {
      return;
    }

    if (error instanceof GenerationCancelledError) {
      // Reachable even though the run guard passed: some cancellation
      // triggers (e.g. falling back to Mock demo mid-generation) abort the
      // in-flight request directly without going through
      // cancelBriefGeneration(), so briefRunIdRef is never superseded. This
      // branch is what establishes capture_ready/telemetry-completion for
      // those paths. When the run *was* superseded by
      // cancelBriefGeneration(), the guard check above already returned
      // before reaching here, so this never double-completes telemetry for
      // the Cancel-button path.
      deps.completeTelemetry(error);
      deps.setSession(resolveBriefCancellationSession);
      deps.cancelActiveGeneration();
      return;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate Decision Brief.";

    deps.completeTelemetry(error instanceof Error ? error : new Error(message));
    deps.setSession((session) =>
      resolveBriefGenerationFailureSession(session, message),
    );
    deps.notifyFailed(error, message);
  }
}
