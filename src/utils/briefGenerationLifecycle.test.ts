import { describe, expect, it, vi } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../data/briefTypes";
import {
  GenerationCancelledError,
  GenerationQualityError,
} from "../services/generation/webGpuErrors";
import type { CaptureLayer } from "../types/captureLayer";
import type { BriefSession } from "../types/brief";
import type { DecisionTrace } from "../types/decisionTrace";
import {
  cancelBriefGeneration,
  runBriefGenerationLifecycle,
  type BriefGenerationLifecycleDeps,
  type BriefGenerationResult,
} from "./briefGenerationLifecycle";

const FAKE_CAPTURE_LAYER = { marker: "accepted-capture-layer" } as unknown as CaptureLayer;

function createSession(overrides: Partial<BriefSession> = {}): BriefSession {
  const now = "2026-01-01T00:00:00.000Z";

  return {
    id: "test-session",
    rawInput: { text: "raw notes", createdAt: now },
    briefType: STRATEGY_DECISION_BRIEF,
    captureLayer: FAKE_CAPTURE_LAYER,
    decisionTrace: null,
    decisionBrief: null,
    status: "capture_ready",
    errors: [],
    errorStep: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createDecisionTrace(): DecisionTrace {
  return { entries: [], created_at: "2026-01-01T00:00:00.000Z" };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createHarness(initialSession: BriefSession) {
  let session = initialSession;
  let activeRunId = 0;

  const deps: BriefGenerationLifecycleDeps = {
    getActiveRunId: () => activeRunId,
    setActiveRunId: (runId) => {
      activeRunId = runId;
    },
    setSession: (updater) => {
      session = updater(session);
    },
    startTelemetry: vi.fn(),
    completeTelemetry: vi.fn(),
    cancelActiveGeneration: vi.fn(),
    notifyStarted: vi.fn(),
    notifyFailed: vi.fn(),
    notifyComplete: vi.fn(),
  };

  return {
    deps,
    getSession: () => session,
  };
}

describe("cancelBriefGeneration", () => {
  it("immediately transitions the session to capture_ready, preserves the Capture Layer, and clears the in-flight brief and trace", () => {
    const initial = createSession({
      status: "generating_brief",
      decisionBrief: {
        markdown: "partial",
        generatedFromCaptureLayer: "test-session",
        briefType: STRATEGY_DECISION_BRIEF,
        editedByUser: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      decisionTrace: createDecisionTrace(),
    });
    const harness = createHarness(initial);

    cancelBriefGeneration(harness.deps);

    const session = harness.getSession();
    expect(session.status).toBe("capture_ready");
    expect(session.captureLayer).toBe(FAKE_CAPTURE_LAYER);
    expect(session.decisionBrief).toBeNull();
    expect(session.decisionTrace).toBeNull();
    expect(session.errors).toEqual([]);
    expect(session.errorStep).toBeNull();
  });

  it("clears any preexisting errors and errorStep on cancellation", () => {
    const initial = createSession({
      status: "generating_brief",
      errors: ["stale message from a prior failure"],
      errorStep: "brief",
    });
    const harness = createHarness(initial);

    cancelBriefGeneration(harness.deps);

    const session = harness.getSession();
    expect(session.errors).toEqual([]);
    expect(session.errorStep).toBeNull();
  });

  it("completes brief telemetry as a cancellation exactly once and does not display it as an error", () => {
    const harness = createHarness(createSession({ status: "generating_brief" }));

    cancelBriefGeneration(harness.deps);

    expect(harness.deps.completeTelemetry).toHaveBeenCalledTimes(1);
    const [completedWith] = vi.mocked(harness.deps.completeTelemetry).mock.calls[0];
    expect(completedWith).toBeInstanceOf(GenerationCancelledError);
  });

  it("aborts the active request", () => {
    const harness = createHarness(createSession({ status: "generating_brief" }));

    cancelBriefGeneration(harness.deps);

    expect(harness.deps.cancelActiveGeneration).toHaveBeenCalledTimes(1);
  });
});

describe("runBriefGenerationLifecycle cancellation interplay", () => {
  it("prevents a late successful response from publishing Markdown or a Decision Trace once cancelled, and completes telemetry only once", async () => {
    const harness = createHarness(createSession({ status: "capture_ready" }));
    const deferred = createDeferred<BriefGenerationResult>();

    const runPromise = runBriefGenerationLifecycle(
      () => deferred.promise,
      STRATEGY_DECISION_BRIEF,
      harness.deps,
    );

    // User clicks Cancel while the request is still in flight.
    cancelBriefGeneration(harness.deps);

    // The in-flight request eventually resolves successfully anyway.
    deferred.resolve({
      markdown: "# Late Decision Brief",
      decisionTrace: createDecisionTrace(),
    });
    await runPromise;

    const session = harness.getSession();
    expect(session.status).toBe("capture_ready");
    expect(session.decisionBrief).toBeNull();
    expect(session.decisionTrace).toBeNull();
    expect(harness.deps.completeTelemetry).toHaveBeenCalledTimes(1);
    expect(harness.deps.notifyComplete).not.toHaveBeenCalled();
  });

  it("prevents a late GenerationCancelledError rejection from altering the already-established cancellation state", async () => {
    const harness = createHarness(createSession({ status: "capture_ready" }));
    const deferred = createDeferred<BriefGenerationResult>();

    const runPromise = runBriefGenerationLifecycle(
      () => deferred.promise,
      STRATEGY_DECISION_BRIEF,
      harness.deps,
    );

    cancelBriefGeneration(harness.deps);
    deferred.reject(new GenerationCancelledError());
    await runPromise;

    const session = harness.getSession();
    expect(session.status).toBe("capture_ready");
    expect(session.decisionBrief).toBeNull();
    expect(session.decisionTrace).toBeNull();
    expect(harness.deps.completeTelemetry).toHaveBeenCalledTimes(1);
    expect(harness.deps.cancelActiveGeneration).toHaveBeenCalledTimes(1);
    expect(harness.deps.notifyFailed).not.toHaveBeenCalled();
  });
});

describe("runBriefGenerationLifecycle normal outcomes", () => {
  it("publishes both the Decision Brief Markdown and the Decision Trace on successful generation", async () => {
    const harness = createHarness(createSession({ status: "capture_ready" }));
    const result: BriefGenerationResult = {
      markdown: "# Decision Brief\n\n## Executive Summary\nBody.",
      decisionTrace: createDecisionTrace(),
    };

    await runBriefGenerationLifecycle(
      () => Promise.resolve(result),
      STRATEGY_DECISION_BRIEF,
      harness.deps,
    );

    const session = harness.getSession();
    expect(session.status).toBe("brief_ready");
    expect(session.decisionBrief?.markdown).toBe(result.markdown);
    expect(session.decisionTrace).toBe(result.decisionTrace);
    expect(harness.deps.completeTelemetry).toHaveBeenCalledWith(null);
    expect(harness.deps.notifyComplete).toHaveBeenCalledTimes(1);
  });

  it("treats a timeout error as a failure, not a cancellation", async () => {
    const harness = createHarness(createSession({ status: "capture_ready" }));
    const timeoutError = new Error("Ollama request timed out after 120000ms.");

    await runBriefGenerationLifecycle(
      () => Promise.reject(timeoutError),
      STRATEGY_DECISION_BRIEF,
      harness.deps,
    );

    const session = harness.getSession();
    expect(session.status).toBe("capture_ready");
    expect(session.errorStep).toBe("brief");
    expect(session.errors).toEqual([timeoutError.message]);
    expect(harness.deps.completeTelemetry).toHaveBeenCalledWith(timeoutError);
    expect(harness.deps.notifyFailed).toHaveBeenCalledWith(
      timeoutError,
      timeoutError.message,
    );
  });

  it("treats a network failure as a failure, not a cancellation", async () => {
    const harness = createHarness(createSession({ status: "capture_ready" }));
    const networkError = new TypeError("fetch failed");

    await runBriefGenerationLifecycle(
      () => Promise.reject(networkError),
      STRATEGY_DECISION_BRIEF,
      harness.deps,
    );

    const session = harness.getSession();
    expect(session.status).toBe("capture_ready");
    expect(session.errorStep).toBe("brief");
    expect(session.errors).toEqual([networkError.message]);
    expect(harness.deps.completeTelemetry).toHaveBeenCalledWith(networkError);
  });

  it("passes the raw error through to notifyFailed so mode-specific messaging (e.g. WebGPU quality-error handling) keeps working unchanged", async () => {
    const harness = createHarness(createSession({ status: "capture_ready" }));
    const qualityError = new GenerationQualityError("Quality gate failed.", [
      "placeholder_leak",
    ]);

    await runBriefGenerationLifecycle(
      () => Promise.reject(qualityError),
      STRATEGY_DECISION_BRIEF,
      harness.deps,
    );

    expect(harness.deps.notifyFailed).toHaveBeenCalledWith(
      qualityError,
      qualityError.message,
    );
  });
});

describe("runBriefGenerationLifecycle non-superseded cancellation", () => {
  it("still reaches capture_ready and completes telemetry once when a GenerationCancelledError arrives without the run being superseded (e.g. switching to Mock demo mid-generation)", async () => {
    const harness = createHarness(createSession({ status: "capture_ready" }));

    await runBriefGenerationLifecycle(
      () => Promise.reject(new GenerationCancelledError()),
      STRATEGY_DECISION_BRIEF,
      harness.deps,
    );

    const session = harness.getSession();
    expect(session.status).toBe("capture_ready");
    expect(session.decisionBrief).toBeNull();
    expect(session.decisionTrace).toBeNull();
    expect(session.errors).toEqual([]);
    expect(session.errorStep).toBeNull();
    expect(harness.deps.completeTelemetry).toHaveBeenCalledTimes(1);
    expect(harness.deps.completeTelemetry).toHaveBeenCalledWith(
      expect.any(GenerationCancelledError),
    );
    expect(harness.deps.cancelActiveGeneration).toHaveBeenCalledTimes(1);
  });
});

describe("cancelBriefGeneration idempotency", () => {
  it("does not throw when cancelled twice in a row and leaves the session in a valid capture_ready state", () => {
    const harness = createHarness(createSession({ status: "generating_brief" }));

    expect(() => {
      cancelBriefGeneration(harness.deps);
      cancelBriefGeneration(harness.deps);
    }).not.toThrow();

    const session = harness.getSession();
    expect(session.status).toBe("capture_ready");
    expect(session.decisionBrief).toBeNull();
    expect(session.decisionTrace).toBeNull();
    expect(session.errors).toEqual([]);
    expect(session.errorStep).toBeNull();
    // cancelBriefGeneration itself has no de-duplication logic; exactly-once
    // completion of the *real* telemetry hook is guaranteed downstream by
    // useGenerationRunTelemetry's completeBrief(), which no-ops once
    // briefStartedAtRef has already been cleared. This test only proves
    // cancelBriefGeneration is safe (no throw, no corrupted state) to call
    // repeatedly, e.g. on a rapid double click.
    expect(harness.deps.completeTelemetry).toHaveBeenCalledTimes(2);
    expect(harness.deps.cancelActiveGeneration).toHaveBeenCalledTimes(2);
  });
});

describe("runBriefGenerationLifecycle run sequencing", () => {
  it("lets a new run started immediately after cancellation reach brief_ready even if the superseded run's promise resolves late", async () => {
    const harness = createHarness(createSession({ status: "capture_ready" }));
    const deferredA = createDeferred<BriefGenerationResult>();

    const runAPromise = runBriefGenerationLifecycle(
      () => deferredA.promise,
      STRATEGY_DECISION_BRIEF,
      harness.deps,
    );

    // User cancels run A, then immediately regenerates (run B) before A's
    // underlying promise has settled.
    cancelBriefGeneration(harness.deps);

    const resultB: BriefGenerationResult = {
      markdown: "# Run B Decision Brief",
      decisionTrace: createDecisionTrace(),
    };
    await runBriefGenerationLifecycle(
      () => Promise.resolve(resultB),
      STRATEGY_DECISION_BRIEF,
      harness.deps,
    );

    let session = harness.getSession();
    expect(session.status).toBe("brief_ready");
    expect(session.decisionBrief?.markdown).toBe(resultB.markdown);

    // Run A's stale promise finally resolves; it must not clobber run B.
    deferredA.resolve({
      markdown: "# Stale Run A Decision Brief",
      decisionTrace: createDecisionTrace(),
    });
    await runAPromise;

    session = harness.getSession();
    expect(session.status).toBe("brief_ready");
    expect(session.decisionBrief?.markdown).toBe(resultB.markdown);
  });
});
