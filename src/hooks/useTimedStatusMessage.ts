import { useEffect, useRef, useState } from "react";

const DEFAULT_CLEAR_MS = 4000;

export function useTimedStatusMessage(clearAfterMs = DEFAULT_CLEAR_MS) {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearMessage() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage("");
  }

  function showMessage(nextMessage: string) {
    clearMessage();
    setMessage(nextMessage);

    if (nextMessage) {
      timeoutRef.current = setTimeout(() => {
        setMessage("");
        timeoutRef.current = null;
      }, clearAfterMs);
    }
  }

  useEffect(() => () => clearMessage(), []);

  return { message, showMessage, clearMessage };
}
