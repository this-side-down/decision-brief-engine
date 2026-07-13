export function DisclosureChevron() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 group-open:rotate-90 group-open:text-slate-600"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
