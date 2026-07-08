type GenerationRunStatusProps = {
  liveStatusMessage?: string;
  failureMessage?: string;
  runDetails?: string[] | null;
};

export function GenerationRunStatus({
  liveStatusMessage,
  failureMessage,
  runDetails,
}: GenerationRunStatusProps) {
  const hasLiveStatus = Boolean(liveStatusMessage);
  const hasFailure = Boolean(failureMessage);
  const hasRunDetails = Boolean(runDetails && runDetails.length > 0);

  if (!hasLiveStatus && !hasFailure && !hasRunDetails) {
    return null;
  }

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
        <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="font-semibold uppercase tracking-wide text-slate-500">
            Run details
          </p>
          <ul className="mt-2 space-y-1">
            {runDetails?.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
