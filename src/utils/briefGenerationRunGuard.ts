export function beginBriefGenerationRun(activeRunId: number): {
  runId: number;
  nextActiveRunId: number;
} {
  const runId = activeRunId + 1;
  return { runId, nextActiveRunId: runId };
}

export function supersedeBriefGenerationRun(activeRunId: number): number {
  return activeRunId + 1;
}

export function isBriefGenerationRunCurrent(
  activeRunId: number,
  runId: number,
): boolean {
  return activeRunId === runId;
}
