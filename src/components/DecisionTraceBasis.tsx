import type { Confidence } from "../types/captureLayer";
import type { DecisionTrace, DecisionTraceEntry } from "../types/decisionTrace";
import {
  formatTraceableBasisSummary,
  groupDecisionTraceEntriesByKind,
} from "../utils/decisionTraceBasisGrouping";
import { DisclosureChevron } from "./DisclosureChevron";

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
 *
 * The collapsed summary shows the recommendation or next-step statement so
 * users can tell which basis they are opening. Long statements truncate
 * visually; the full text remains in the DOM for assistive technology and
 * is available on hover via `title`.
 */
export function TraceBasisDisclosure({ entry }: { entry: DecisionTraceEntry }) {
  const { basis } = entry;

  return (
    <details className="group/basis min-w-0 rounded border border-slate-200 bg-white p-2">
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 rounded transition-colors hover:bg-slate-50 group-open/basis:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/10 [&::-webkit-details-marker]:hidden">
        <span
          className="min-w-0 flex-1 truncate text-xs font-medium leading-5 text-slate-800"
          title={entry.statement}
        >
          {entry.statement}
        </span>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400 group-open/basis:text-slate-600">
          Basis
        </span>
        <DisclosureChevron groupName="basis" />
      </summary>
      <div className="mt-2 min-w-0 space-y-2 border-t border-slate-100 pt-2">
        <ConfidenceBadge confidence={entry.confidence} />
        <BasisTextField label="Statement" value={entry.statement} />
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
          <TraceBasisDisclosure
            entry={entry}
            key={`${entry.kind}-${index}`}
          />
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
 * Closed by default behind a native disclosure: the Decision Brief is the
 * primary output artifact, and the recommendation/next-step statements
 * this section provides rationale for are already visible above it, so the
 * collapsed state only needs to communicate that basis exists (via a
 * count-only summary — no confidence tally) rather than show it. There is
 * no fixed-height inner scroll region; once expanded, the surrounding
 * Decision Brief column/page scrolling handles the content like everything
 * else in that column.
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

  const summary = formatTraceableBasisSummary(groups);

  return (
    <details className="group mt-3 min-w-0 shrink-0 rounded border border-slate-200 bg-slate-50 p-3">
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 rounded transition-colors hover:bg-slate-50 group-open:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/10 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Traceable basis
          </span>
          <span className="shrink-0 text-[10px] font-medium text-slate-400 group-open:text-slate-500">
            {summary}
          </span>
        </div>
        <DisclosureChevron />
      </summary>
      <div className="mt-3 min-w-0 space-y-3">
        <TraceEntryGroup entries={groups.recommendations} title="Recommendations" />
        <TraceEntryGroup entries={groups.nextSteps} title="Next steps" />
      </div>
    </details>
  );
}
