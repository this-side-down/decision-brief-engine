export function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
          Decision Brief Engine
        </p>
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Turn messy decision context into durable briefs.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            The MVP shell is ready for the mocked Capture Layer to Decision
            Brief pipeline. Product workflow, model adapters, and inference
            wiring are intentionally out of scope for this scaffold.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {["Paste notes", "Generate Capture Layer", "Export Markdown"].map(
            (step) => (
              <div
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300"
                key={step}
              >
                {step}
              </div>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
