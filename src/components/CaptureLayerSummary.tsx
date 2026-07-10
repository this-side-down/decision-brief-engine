import type { BriefType } from "../types/brief";
import type { CaptureLayer } from "../types/captureLayer";
import { formatCaptureLayerSummarySignals } from "../utils/captureLayerSummarySignals";

function captureCardTextClassName() {
  return "mt-2 min-w-0 break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]";
}

function TextSection({ label, value }: { label: string; value: string }) {
  return (
    <section className="min-w-0 rounded border border-slate-200 bg-white p-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </h3>
      <p className={captureCardTextClassName()}>{value || "Not captured yet."}</p>
    </section>
  );
}

function ListSection({ items, label }: { items: string[]; label: string }) {
  return (
    <section className="min-w-0 rounded border border-slate-200 bg-white p-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </h3>
      {items.length > 0 ? (
        <ul className="mt-2 min-w-0 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-700">
          {items.map((item) => (
            <li className="break-words [overflow-wrap:anywhere]" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-400">Not captured yet.</p>
      )}
    </section>
  );
}

/**
 * Full Capture Layer field rendering. Unchanged from the original inline
 * App.tsx implementation — this is a presentation move, not a content
 * rewrite. Every field shown here today remains shown, unchanged, when
 * expanded.
 */
function CaptureLayerFields({ captureLayer }: { captureLayer: CaptureLayer }) {
  return (
    <div className="min-w-0 space-y-3 border border-slate-200 bg-slate-50 p-4">
      <div className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-200 bg-white p-3 text-xs text-slate-600">
        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-500">
          Confidence
        </span>
        <span className="min-w-0 break-words text-right font-semibold text-slate-900 [overflow-wrap:anywhere]">
          {captureLayer.confidence}
        </span>
      </div>
      <TextSection label="Stated Decision" value={captureLayer.stated_decision} />
      <TextSection label="Implied Decision" value={captureLayer.implied_decision} />
      <TextSection
        label="Recommendation Candidate"
        value={captureLayer.recommendation_candidate}
      />
      <ListSection label="Missing Context" items={captureLayer.missing_context} />
      <ListSection label="Open Questions" items={captureLayer.open_questions} />
      <ListSection label="Assumptions" items={captureLayer.assumptions} />
      <ListSection label="Risks" items={captureLayer.risks} />
      <ListSection label="Constraints" items={captureLayer.constraints} />
      <ListSection label="Suggested Next Steps" items={captureLayer.suggested_next_steps} />
    </div>
  );
}

/**
 * Capture Layer's own progressive disclosure, mirroring the PR #100
 * Traceable Basis pattern one level up the product hierarchy: Capture
 * Layer owns "what the system understood" and is the primary intermediate
 * artifact before a Decision Brief exists, so it renders fully expanded
 * with no extra disclosure chrome — identical to today's behavior. Once a
 * Decision Brief exists, the brief becomes the primary reading surface
 * ("what to do") and Capture Layer becomes secondary: collapsed by default
 * behind a compact, count-only summary line inside a native `<details>`,
 * with every field still fully available on expansion.
 *
 * `key` is set to the coarse phase boundary itself (`hasDecisionBrief`),
 * not a controlled `open` prop, so this never fights a manual user toggle.
 * A controlled `open={hasDecisionBrief}` would force React to re-apply
 * that value on every render where it's unchanged from before, but it can
 * still clobber a toggle the moment any *other* prop on this element also
 * changes and forces a DOM update. Keying on the phase boundary instead
 * guarantees a full remount — and a fresh default `open` state — happens
 * only at the one transition that should reset it (no brief -> brief
 * exists), while every render within a phase reuses the same element
 * instance and leaves whatever open/closed state the user left it in.
 */
export function CaptureLayerSummary({
  briefType,
  captureLayer,
  hasDecisionBrief,
}: {
  briefType: BriefType | null;
  captureLayer: CaptureLayer;
  hasDecisionBrief: boolean;
}) {
  if (!hasDecisionBrief) {
    return (
      <div className="min-w-0" key="expanded">
        <CaptureLayerFields captureLayer={captureLayer} />
      </div>
    );
  }

  const summary = formatCaptureLayerSummarySignals(briefType, captureLayer);

  return (
    <details className="group min-w-0" key="collapsed">
      <summary className="flex min-w-0 cursor-pointer list-none flex-col gap-1 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 group-open:text-slate-600">
          Capture Layer
        </span>
        <span className="min-w-0 break-words text-slate-500 [overflow-wrap:anywhere] group-open:text-slate-600">
          {summary}
        </span>
      </summary>
      <div className="mt-3 min-w-0">
        <CaptureLayerFields captureLayer={captureLayer} />
      </div>
    </details>
  );
}
