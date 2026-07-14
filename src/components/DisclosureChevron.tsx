export type DisclosureChevronVariant = "default" | "basis";

export const DISCLOSURE_CHEVRON_OPEN_CLASSES: Record<DisclosureChevronVariant, string> = {
  default: "group-open:rotate-90 group-open:text-slate-600",
  basis: "group-open/basis:rotate-90 group-open/basis:text-slate-600",
};

type DisclosureChevronProps = {
  variant?: DisclosureChevronVariant;
  open?: boolean;
};

export function DisclosureChevron({
  variant = "default",
  open,
}: DisclosureChevronProps = {}) {
  const openClasses =
    open === undefined
      ? DISCLOSURE_CHEVRON_OPEN_CLASSES[variant]
      : open
        ? "rotate-90 text-slate-600"
        : "text-slate-400";

  return (
    <svg
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${openClasses}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
