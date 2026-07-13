type DisclosureChevronProps = {
  groupName?: string;
};

export function DisclosureChevron({ groupName }: DisclosureChevronProps = {}) {
  const openRotateClass = groupName
    ? `group-open/${groupName}:rotate-90 group-open/${groupName}:text-slate-600`
    : "group-open:rotate-90 group-open:text-slate-600";

  return (
    <svg
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${openRotateClass}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
