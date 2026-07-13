import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const previewComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-0 text-xl font-semibold tracking-tight text-slate-900">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-6 text-lg font-semibold text-slate-900 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-base font-semibold text-slate-900 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-7 text-slate-800 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1 pl-5 leading-7 text-slate-800 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1 pl-5 leading-7 text-slate-800 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="[overflow-wrap:anywhere]">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-4 border-slate-200 pl-4 italic text-slate-600 last:mb-0">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");

    if (isBlock) {
      return (
        <code className="block overflow-x-auto whitespace-pre font-mono text-[0.8125rem] leading-6 text-slate-800">
          {children}
        </code>
      );
    }

    return (
      <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.8125rem] text-slate-800">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded border border-slate-200 bg-slate-50 p-3 last:mb-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-6 border-slate-200" />,
  table: ({ children }) => (
    <div className="mb-4 max-w-full overflow-x-auto last:mb-0">
      <table className="min-w-full border-collapse text-left text-sm leading-6 text-slate-800">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-slate-200">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold text-slate-900">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
  input: ({ checked, disabled, type }) => {
    if (type !== "checkbox") {
      return <input checked={checked} disabled={disabled} type={type} />;
    }

    return (
      <input
        checked={checked}
        className="mr-2 align-middle"
        disabled
        readOnly
        type="checkbox"
      />
    );
  },
  del: ({ children }) => <del className="text-slate-500">{children}</del>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
};

export function DecisionBriefPreview({ markdown }: { markdown: string }) {
  return (
    <article
      aria-label="Rendered Decision Brief preview"
      className="min-h-0 w-full flex-1 border border-slate-200 bg-white p-4"
    >
      <ReactMarkdown components={previewComponents} remarkPlugins={[remarkGfm]}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
