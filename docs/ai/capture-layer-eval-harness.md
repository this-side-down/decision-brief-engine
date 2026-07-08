# Capture Layer evaluation harness

## Purpose

Provide a repeatable way to judge Capture Layer quality across:

1. Mock generation
2. Local Ollama generation
3. Experimental browser WebGPU generation

This harness exists so model or prompt changes in later work (for example #73) can be compared against the same Capture Layer gate instead of one-off impressions.

It does **not** ungate public WebGPU, tune prompts, add model variants, or certify production quality by itself.

## Pass / fail criteria

Evaluate Capture Layer quality in this order:

### 1. Schema gate (hard, automated)

A run **fails** immediately if Capture Layer output is not valid JSON or does not conform to the typed Capture Layer schema (`parseCaptureLayerJson` / `CAPTURE_LAYER_FIELDS`).

Do not score product quality or generate a Decision Brief until the schema gate passes.

Counting rules for live models that repair once (WebGPU):

- Count schema success **after** the existing one-repair-retry path.
- If schema still fails after retry, the case fails the schema gate.

### 2. Structural readiness gate (automated)

After schema pass, the harness checks that the Capture Layer is non-hollow for Decision Brief generation on the construction Strategy case:

| Check | Default threshold (construction Strategy) |
| --- | --- |
| Decision present | `stated_decision` or `implied_decision` non-empty |
| Options | ≥ 3 |
| Stakeholders | ≥ 4 |
| Risks | ≥ 3 |
| Assumptions | ≥ 2 |
| Open questions | ≥ 3 |
| Missing context | ≥ 2 |
| Recommendation | `recommendation_candidate` non-empty |
| Confidence | `High` \| `Medium` \| `Low` |

**Automated overall pass** = schema pass **and** structural readiness pass.

That automated pass means: proceed to Decision Brief generation is justified for local comparison. It is **not** the full ungating decision.

### 3. Human product-quality scorecard (manual)

If automated gates pass, score with [`fixtures/evaluation/manual-scorecard.md`](../../fixtures/evaluation/manual-scorecard.md) (0–2 per category, /16):

- Decision clarity
- Option / stakeholder / constraint-risk / open-question preservation
- Recommendation grounding
- Confidence calibration
- Brief usefulness (only after generating the brief)

Use [`docs/ai/browser-model-quality-gate.md`](browser-model-quality-gate.md) for the broader five-fixture ungating thresholds. This harness’s first case is the built-in construction Strategy example (`fixtures/evaluation/strategy-tradeoff.md`).

### Decision rule for “good enough to proceed to brief”

| Result | Meaning |
| --- | --- |
| Schema fail | Do not generate Decision Brief for quality comparison. Record failure. |
| Schema pass, structural fail | Capture Layer is typed but too empty/unreliable to treat as brief-ready. |
| Automated pass | Safe to generate Decision Brief and complete the manual scorecard. |
| Manual scorecard | Required for product-quality judgment and any ungating discussion. |

Ungating public WebGPU still requires the hard/score/UX gates in `browser-model-quality-gate.md`, not a single construction smoke run.

## First evaluation case

| Field | Value |
| --- | --- |
| Case ID | `construction-strategy` |
| Name | Construction workforce planning (Strategy) |
| Raw input | `fixtures/construction-workforce-planning/messy-transcript.md` |
| In-app equivalent | Load example notes → Strategy Decision Brief |
| Fixture doc | `fixtures/evaluation/strategy-tradeoff.md` |
| Reviewer reference | `fixtures/construction-workforce-planning/structured-reference.md` |

## How to run

### Mock (automated, CI-friendly)

```sh
npm run eval:capture -- --mode=mock
npm run eval:capture -- --mode=mock --json
npm run eval:capture -- --mode=mock --out=tmp/mock-construction.json
```

Expected: schema pass + structural pass for the construction Strategy case.

### Local Ollama (automated, requires local Ollama)

```sh
# Ollama running with qwen3:4b (or VITE_OLLAMA_MODEL)
npm run eval:capture -- --mode=ollama
npm run eval:capture -- --mode=ollama --json --out=tmp/ollama-construction.json
```

Optional env (Node CLI defaults `VITE_OLLAMA_BASE_URL` to `http://127.0.0.1:11434` when unset):

```sh
VITE_OLLAMA_MODEL=qwen3:4b
VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434
VITE_OLLAMA_TIMEOUT_MS=120000
```

### Browser WebGPU (manual — not CLI-automatable)

WebGPU inference depends on the browser, WebGPU, model download/cache, and the in-app engine. The CLI cannot run it:

```sh
npm run eval:capture -- --mode=webgpu
# prints the manual procedure pointer and exits non-zero
```

#### Manual WebGPU procedure (same case + same gates)

1. Set `VITE_ENABLE_WEBGPU_INFERENCE=true` in `.env.local` (or the preview build env).
2. Run `npm run dev` (or `npm run build` + `npm run preview`).
3. Opt into **Live in browser**, accept download disclosure, wait until the model is ready.
4. Click **Load example notes** (construction Strategy) or paste `fixtures/construction-workforce-planning/messy-transcript.md` and select Strategy.
5. Generate Capture Layer.
6. Record:
   - Valid JSON: yes/no (after the built-in one-retry path)
   - Schema pass: yes/no
   - Latency roughly to success or final failure
   - Schema/parse error text if any
7. If schema + structural readiness would pass (non-empty decision, options, risks, open questions, missing context, recommendation), generate the Decision Brief and complete `manual-scorecard.md`.
8. Paste a result row into [`fixtures/evaluation/browser-model-results.md`](../../fixtures/evaluation/browser-model-results.md) using the CLI markdown table row shape (see Output format below).

Known baseline: Qwen2.5-1.5B failed schema on this construction case in the 2026-07-07 smoke (`stated_decision` missing). WebGPU remains gated.

## Output format

CLI markdown output includes:

- Mode, model, timestamp, latency
- Valid JSON / schema pass
- Structural readiness checks
- Automated proceed-to-brief yes/no
- A paste-ready row for `browser-model-results.md`
- Placeholder for human scorecard total (/16)

JSON summary (`--json`) omits the full Capture Layer. Use `--out=<path>` to write the full record including `captureLayer` for later #73 comparisons. Do not commit large model dumps or proprietary comparisons.

## Supporting tests

```sh
npm test
```

Covers schema parsing helpers, structural readiness, and the mock construction Strategy path. Ollama and WebGPU remain local/manual.

## Related documents

- [Browser model quality gate](browser-model-quality-gate.md)
- [Evaluation plan](evaluation-plan.md)
- [Manual scorecard](../../fixtures/evaluation/manual-scorecard.md)
- [Evaluation fixtures README](../../fixtures/evaluation/README.md)
- [Capture Layer contract](../product/capture-layer.md)
