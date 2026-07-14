import { useEffect, useRef, useState } from "react";
import {
  formatWebGpuRawInputFeedbackLine,
  WEBGPU_INPUT_TOO_LARGE_USER_MESSAGE,
  type WebGpuRawInputFeedback,
} from "../../services/generation/webGpuInputBudget";

type RawInputLengthFeedbackProps = {
  feedback: WebGpuRawInputFeedback | null;
  helpId: string;
  helpText: string;
  lengthFeedbackId: string;
};

export function RawInputLengthFeedback({
  feedback,
  helpId,
  helpText,
  lengthFeedbackId,
}: RawInputLengthFeedbackProps) {
  const previousThresholdRef = useRef<
    WebGpuRawInputFeedback["threshold"] | null
  >(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!feedback) {
      previousThresholdRef.current = null;
      setAnnouncement("");
      return;
    }

    if (previousThresholdRef.current === feedback.threshold) {
      return;
    }

    previousThresholdRef.current = feedback.threshold;

    if (feedback.liveRegionMessage) {
      setAnnouncement(feedback.liveRegionMessage);
    } else {
      setAnnouncement("");
    }
  }, [feedback]);

  return (
    <div className="space-y-1">
      {feedback ? (
        <p className="text-xs text-slate-700" id={lengthFeedbackId}>
          {formatWebGpuRawInputFeedbackLine(feedback)}
        </p>
      ) : null}
      {feedback?.threshold === "over_limit" ? (
        <p className="text-xs text-slate-700">
          Error: {WEBGPU_INPUT_TOO_LARGE_USER_MESSAGE}
        </p>
      ) : null}
      <p className="text-xs text-slate-500" id={helpId}>
        {helpText}
      </p>
      <p
        aria-atomic="true"
        aria-live="polite"
        className="absolute m-[-1px] h-px w-px overflow-hidden whitespace-nowrap border-0 p-0"
        role="status"
      >
        {announcement}
      </p>
    </div>
  );
}
