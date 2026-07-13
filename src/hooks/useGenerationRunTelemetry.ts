import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GenerationMode } from "../services/generation/generationMode";
import {
  classifyStepOutcome,
  createGenerationRunRecord,
  formatBriefStepMessage,
  formatCaptureStepMessage,
  formatModelLoadStepMessage,
  formatRunDetailsLines,
  formatStepFailureMessage,
  shouldShowGenerationTelemetry,
  type GenerationRunRecord,
  type GenerationStep,
  type WebGpuGenerationEval,
} from "../services/generation/generationRunTelemetry";

type UseGenerationRunTelemetryOptions = {
  runtimeMode: GenerationMode;
  configuredTimeoutMs?: number;
};

export function useGenerationRunTelemetry({
  runtimeMode,
  configuredTimeoutMs,
}: UseGenerationRunTelemetryOptions) {
  const enabled = shouldShowGenerationTelemetry(runtimeMode);
  const [currentStep, setCurrentStep] = useState<GenerationStep>("idle");
  const [stepStartedAt, setStepStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [runRecord, setRunRecord] = useState<GenerationRunRecord | null>(null);
  const runStartedAtRef = useRef<number | null>(null);
  const captureStartedAtRef = useRef<number | null>(null);
  const briefStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || currentStep === "idle" || stepStartedAt === null) {
      return;
    }

    const interval = setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, currentStep, stepStartedAt]);

  const resetRun = useCallback(() => {
    setCurrentStep("idle");
    setStepStartedAt(null);
    setRunRecord(null);
    runStartedAtRef.current = null;
    captureStartedAtRef.current = null;
    briefStartedAtRef.current = null;
  }, []);

  const beginRun = useCallback(() => {
    if (!enabled) {
      return;
    }

    const startedAt = Date.now();
    runStartedAtRef.current = startedAt;
    setRunRecord(createGenerationRunRecord(runtimeMode));
    setCurrentStep("idle");
    setStepStartedAt(null);
  }, [enabled, runtimeMode]);

  const startModelLoad = useCallback(() => {
    if (!enabled) {
      return;
    }

    setCurrentStep("model_load");
    setStepStartedAt(Date.now());
  }, [enabled]);

  const completeModelLoad = useCallback((durationMs: number) => {
    if (!enabled) {
      return;
    }

    setRunRecord((current) =>
      current ? { ...current, modelLoadDurationMs: durationMs } : current,
    );
    setCurrentStep("idle");
    setStepStartedAt(null);
  }, [enabled]);

  const startCapture = useCallback(() => {
    if (!enabled) {
      return;
    }

    if (runStartedAtRef.current === null) {
      beginRun();
    }

    const startedAt = Date.now();
    captureStartedAtRef.current = startedAt;
    setCurrentStep("capture");
    setStepStartedAt(startedAt);
  }, [beginRun, enabled]);

  const initializeWebGpuEval = useCallback(
    (evalContext: Omit<WebGpuGenerationEval, "captureFirstAttemptSchemaPass" | "briefFirstAttemptSchemaPass">) => {
      if (!enabled) {
        return;
      }

      setRunRecord((current) => {
        const base = current ?? createGenerationRunRecord(runtimeMode);

        return {
          ...base,
          webGpuEval: {
            ...evalContext,
            captureFirstAttemptSchemaPass: null,
            briefFirstAttemptSchemaPass: null,
          },
        };
      });
    },
    [enabled, runtimeMode],
  );

  const recordCaptureFirstAttempt = useCallback((parsePass: boolean) => {
    if (!enabled) {
      return;
    }

    setRunRecord((current) =>
      current?.webGpuEval
        ? {
            ...current,
            webGpuEval: {
              ...current.webGpuEval,
              captureFirstAttemptSchemaPass: parsePass,
            },
          }
        : current,
    );
  }, [enabled]);

  const recordBriefFirstAttempt = useCallback((parsePass: boolean) => {
    if (!enabled) {
      return;
    }

    setRunRecord((current) =>
      current?.webGpuEval
        ? {
            ...current,
            webGpuEval: {
              ...current.webGpuEval,
              briefFirstAttemptSchemaPass: parsePass,
            },
          }
        : current,
    );
  }, [enabled]);

  const recordCaptureRetry = useCallback(() => {
    if (!enabled) {
      return;
    }

    setRunRecord((current) =>
      current
        ? {
            ...current,
            captureRetryCount: current.captureRetryCount + 1,
          }
        : current,
    );
    setCurrentStep("capture_retry");
    setStepStartedAt(captureStartedAtRef.current ?? Date.now());
  }, [enabled]);

  const completeCapture = useCallback(
    (error: Error | null) => {
      if (!enabled || captureStartedAtRef.current === null) {
        return;
      }

      const durationMs = Date.now() - captureStartedAtRef.current;
      const outcome = classifyStepOutcome(error, configuredTimeoutMs);

      setRunRecord((current) =>
        current
          ? {
              ...current,
              captureDurationMs: durationMs,
              captureOutcome: outcome,
              captureError: error?.message ?? null,
            }
          : current,
      );
      setCurrentStep("idle");
      setStepStartedAt(null);
      captureStartedAtRef.current = null;
    },
    [configuredTimeoutMs, enabled],
  );

  const recordBriefRetry = useCallback(() => {
    if (!enabled) {
      return;
    }

    setRunRecord((current) =>
      current
        ? {
            ...current,
            briefRetryCount: current.briefRetryCount + 1,
          }
        : current,
    );
  }, [enabled]);

  const startBrief = useCallback(() => {
    if (!enabled) {
      return;
    }

    if (runStartedAtRef.current === null) {
      beginRun();
    }

    const startedAt = Date.now();
    briefStartedAtRef.current = startedAt;
    setCurrentStep("brief");
    setStepStartedAt(startedAt);
  }, [beginRun, enabled]);

  const completeBrief = useCallback(
    (error: Error | null) => {
      if (!enabled || briefStartedAtRef.current === null) {
        return;
      }

      const durationMs = Date.now() - briefStartedAtRef.current;
      const outcome = classifyStepOutcome(error, configuredTimeoutMs);

      setRunRecord((current) =>
        current
          ? {
              ...current,
              briefDurationMs: durationMs,
              briefOutcome: outcome,
              briefError: error?.message ?? null,
            }
          : current,
      );
      setCurrentStep("idle");
      setStepStartedAt(null);
      briefStartedAtRef.current = null;
    },
    [configuredTimeoutMs, enabled],
  );

  const cancelModelLoad = useCallback(() => {
    if (!enabled) {
      return;
    }

    setCurrentStep("idle");
    setStepStartedAt(null);
  }, [enabled]);

  const liveStatusMessage = useMemo(() => {
    void tick;

    if (!enabled || currentStep === "idle" || stepStartedAt === null) {
      return "";
    }

    const elapsedMs = Date.now() - stepStartedAt;

    switch (currentStep) {
      case "model_load":
        return formatModelLoadStepMessage(elapsedMs);
      case "capture":
        return formatCaptureStepMessage({ step: "capture", elapsedMs });
      case "capture_retry":
        return formatCaptureStepMessage({ step: "capture_retry", elapsedMs });
      case "brief":
        return formatBriefStepMessage(elapsedMs);
      default:
        return "";
    }
  }, [currentStep, enabled, stepStartedAt, tick]);

  const failureMessage = useMemo(() => {
    if (!enabled || !runRecord) {
      return "";
    }

    if (runRecord.captureOutcome === "timeout") {
      return formatStepFailureMessage({
        step: "capture",
        outcome: "timeout",
        errorMessage: runRecord.captureError ?? "",
        fallbackTimeoutMs: configuredTimeoutMs,
      });
    }

    if (runRecord.briefOutcome === "timeout") {
      return formatStepFailureMessage({
        step: "brief",
        outcome: "timeout",
        errorMessage: runRecord.briefError ?? "",
        fallbackTimeoutMs: configuredTimeoutMs,
      });
    }

    return "";
  }, [configuredTimeoutMs, enabled, runRecord]);

  const runDetails = useMemo(() => {
    if (!enabled || !runRecord) {
      return null;
    }

    const hasCaptureResult = runRecord.captureOutcome !== null;
    const hasBriefResult = runRecord.briefOutcome !== null;

    if (!hasCaptureResult && !hasBriefResult && runRecord.modelLoadDurationMs === null) {
      return null;
    }

    return formatRunDetailsLines(runRecord);
  }, [enabled, runRecord]);

  return {
    enabled,
    currentStep,
    liveStatusMessage,
    failureMessage,
    runDetails,
    runRecord,
    beginRun,
    resetRun,
    startModelLoad,
    completeModelLoad,
    cancelModelLoad,
    startCapture,
    initializeWebGpuEval,
    recordCaptureFirstAttempt,
    recordCaptureRetry,
    completeCapture,
    startBrief,
    recordBriefFirstAttempt,
    recordBriefRetry,
    completeBrief,
  };
}
