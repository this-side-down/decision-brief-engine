import type { Confidence } from "../types/captureLayer";
import type { DecisionTrace, DecisionTraceEntry } from "../types/decisionTrace";
import { groupDecisionTraceEntriesByKind } from "../utils/decisionTraceBasisGrouping";

function basisListClassName() {
  return "mt-1 list-disc space-y-0.5 pl-4 text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]";
}

function BasisTextField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) {
    return null;
  }

  return (
    <div className="min-w-0">
      <h5 className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </h5>
      <p className="mt-1 min-w-0 break-words text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function BasisListField({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0">
      <h5 className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </h5>
      <ul className={basisListClassName()}>
        {items.map((item) => (
          <li className="break-words [overflow-wrap:anywhere]" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {confidence} confidence
    </span>
  );
}

/**
 * A single trace entry's structured basis, collapsed by default behind a
 * native disclosure so the Decision Brief stays skimmable. Reuses the
 * Capture Layer's text/list field styling rather than introducing a new
 * visual language.
 */
export function TraceBasisDisclosure({ entry }: { entry: DecisionTraceEntry }) {
  const { basis } = entry;

  return (
    <details className="group min-w-0 rounded border border-slate-200 bg-white p-2">
      <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-2">
        <span className="min-w-0 flex-1 break-words text-xs font-medium leading-5 text-slate-800 [overflow-wrap:anywhere]">
          {entry.statement}
        </span>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400 group-open:text-slate-600">
          Basis
        </span>
      </summary>
      <div className="mt-2 min-w-0 space-y-2 border-t border-slate-100 pt-2">
        <ConfidenceBadge confidence={entry.confidence} />
        <BasisTextField label="Intent Served" value={basis.intent} />
        <BasisListField label="Supporting Evidence" items={basis.supporting_evidence} />
        <BasisListField label="Assumptions Relied On" items={basis.assumptions_relied_on} />
        <BasisListField label="Risks Addressed" items={basis.risks_addressed} />
        <BasisListField label="Risks Accepted" items={basis.risks_accepted} />
        <BasisListField label="Constraints Respected" items={basis.constraints_respected} />
        <BasisListField
          label="Alternatives Considered"
          items={basis.alternatives_considered}
        />
        <BasisListField label="Tradeoffs" items={basis.tradeoffs} />
        <BasisListField
          label="Missing Context Caveats"
          items={basis.missing_context_caveats}
        />
        <BasisListField label="Would Change If" items={entry.would_change_if} />
      </div>
    </details>
  );
}

function TraceEntryGroup({
  title,
  entries,
}: {
  title: string;
  entries: DecisionTraceEntry[];
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {title}
      </h4>
      <div className="space-y-1.5">
        {entries.map((entry, index) => (
          <TraceBasisDisclosure entry={entry} key={`${entry.kind}-${index}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact "Traceable basis" section rendered beneath the Decision Brief
 * editor. Groups Decision Trace entries by kind (recommendation / next step)
 * rather than inlining basis details next to individual Markdown bullets,
 * since the brief is an editable raw-Markdown textarea and not a parsed
 * document — this avoids brittle Markdown AST matching while still keeping
 * the trace inside the existing Decision Brief column.
 *
 * Renders nothing when there is no Decision Trace, and a quiet empty-state
 * note when the trace exists but has no entries.
 */
export function DecisionTraceBasis({
  decisionTrace,
}: {
  decisionTrace: DecisionTrace | null;
}) {
  const groups = groupDecisionTraceEntriesByKind(decisionTrace);

  if (!groups) {
    return null;
  }

  if (groups.recommendations.length === 0 && groups.nextSteps.length === 0) {
    return (
      <div className="mt-3 shrink-0 rounded border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">
        No trace basis available.
      </div>
    );
  }

  return (
    <div className="mt-3 max-h-56 min-w-0 shrink-0 space-y-3 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Traceable basis
      </h3>
      <TraceEntryGroup entries={groups.recommendations} title="Recommendations" />
      <TraceEntryGroup entries={groups.nextSteps} title="Next steps" />
    </div>
  );
}
