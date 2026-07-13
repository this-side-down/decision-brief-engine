export type DisclosureChevronVariant = "default" | "basis";

export const DISCLOSURE_CHEVRON_OPEN_CLASSES: Record<DisclosureChevronVariant, string> = {
  default: "group-open:rotate-90 group-open:text-slate-600",
  basis: "group-open/basis:rotate-90 group-open/basis:text-slate-600",
};

type DisclosureChevronProps = {
  variant?: DisclosureChevronVariant;
};

export function DisclosureChevron({ variant = "default" }: DisclosureChevronProps = {}) {
  return (
    <svg
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${DISCLOSURE_CHEVRON_OPEN_CLASSES[variant]}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
