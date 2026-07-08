# Live browser inference UX

## Purpose

Define the user experience for an **opt-in** browser WebGPU inference mode in Decision Brief Engine.

This document satisfies the planning scope for [#59](https://github.com/this-side-down/decision-brief-engine/issues/59). It does not implement UI, add dependencies, or change app behavior.

The UX must support the hybrid staged inference path in [ADR 0004](../decisions/0004-inference-path-decision-brief.md):

- Mocked generation remains the public default.
- Browser WebGPU inference is an explicit opt-in path behind the existing `ModelAdapter` boundary.
- Local Ollama remains the higher-quality local/dev path.
- Public hosted inference remains deferred.

Implementation of this UX belongs in [#60](https://github.com/this-side-down/decision-brief-engine/issues/60). Do not start #60 until this document is merged.

## Product posture

| Principle | UX requirement |
| --- | --- |
| Mock mode remains default | New sessions and public demo traffic start in **Mock demo** unless the user explicitly opts into browser inference in the current browser profile. |
| Browser inference is opt-in | No automatic model download, no background prefetch on app load, no silent mode switch. |
| Local Ollama remains higher-quality local/dev path | When visible, label it clearly and do not imply browser inference matches Ollama quality. |
| Public hosted inference remains deferred | Do not present a hosted model API, account sign-in, or "cloud generation" path in this slice. |

## User-facing mode labels

Use these exact labels wherever the active generation mode is shown:

| Internal mode | User-facing label | Visibility |
| --- | --- | --- |
| `mock` | **Mock demo** | Always visible when mock is active |
| `webgpu` | **Live in browser** | Visible when browser inference is active or loading |
| `ollama` | **Local Ollama** | Only in local/dev contexts where Ollama is configured and reachable |

Mode labels must stay visible during generation, download, retry, and error states so users always know which path is active.

## Entry point for opting in

Primary entry point:

- A **Generation mode** control in the generation settings area of the workflow (same surface where brief type is selected or immediately adjacent to the primary generate action).
- Default selection: **Mock demo**.
- Secondary option: **Live in browser** (enabled only after preflight checks pass; otherwise show why it is unavailable with a link to fallback guidance).

Opt-in flow:

1. User selects **Live in browser**.
2. If the model is not cached, show the first-run disclosure (below) before any download starts.
3. User confirms download; show download/load progress.
4. On success, persist the opt-in choice for the current browser profile and use browser inference for subsequent generations until the user switches back to **Mock demo** or clears site data.

Do not start model download until the user confirms the disclosure.

## Preflight checks

Run these checks when the user selects **Live in browser** or when the settings surface first renders the option. Fail closed: if a check fails, disable opt-in and explain the fallback.

| Check | Pass criteria | Failure UX |
| --- | --- | --- |
| WebGPU support | `navigator.gpu` available and adapter request succeeds | **Browser unsupported** state |
| Browser/device capability | Supported browser class per [adapter feasibility](../ai/browser-inference-adapter-feasibility.md); recommended ≥ 4 GB system memory for primary model | Explain device/browser limitation; offer **Mock demo** |
| Storage/cache availability | IndexedDB usable; sufficient quota signal or graceful handling if quota denied | Explain cache requirement; offer retry or **Mock demo** |
| First-load network requirement | Network available when model is not cached | Explain one-time download requirement; allow retry when online |

Safari WebGPU is best-effort until separately verified. Treat uncertain support as unsupported with a clear message rather than a silent degraded path.

## First-run disclosure copy

Show before the first model download in the current browser profile. Require explicit confirmation.

**Title:** Use live generation in your browser

**Body copy (required elements):**

- **Model download size:** "This mode downloads about **1.0–1.2 GB** of model data the first time you use it on this device and browser."
- **One-time download:** "After the first successful download, the model is cached locally in this browser. Repeat visits should not re-download unless you clear site data."
- **Local browser execution:** "Generation runs on your device using WebGPU. Your notes stay in the browser during inference."
- **No hosted model API:** "Decision Brief Engine does not send your notes to a hosted model API for this mode."
- **Notes not sent to hosted inference:** "Raw notes are not transmitted to Decision Brief Engine servers for generation."
- **Quality caveat:** "Output quality may be weaker than **Local Ollama** or manual editing. Browser inference is an early opt-in path."

**Primary action:** Download and continue

**Secondary action:** Stay on Mock demo

## UX states

Each state must expose: user-visible message, primary action, secondary action, and fallback behavior.

| State | User message | Primary action | Secondary action | Fallback |
| --- | --- | --- | --- | --- |
| Mock default | "Using **Mock demo**. Sample output only—no model download." | Generate Capture Layer | Switch to Live in browser (if supported) | N/A (default path) |
| Browser unsupported | "Live in browser is not available here. This browser or device does not support WebGPU inference." | Stay on Mock demo | Learn why (short help) | Remain on **Mock demo** |
| Ready to opt in | "Run real generation in your browser. Requires a one-time model download." | Continue | Stay on Mock demo | **Mock demo** |
| Download disclosure | First-run disclosure copy (above) | Download and continue | Stay on Mock demo | **Mock demo** |
| Downloading model | "Downloading model for live browser generation… **{percent}%**" (or indeterminate if size unknown) | Cancel download | — | Cancel → **Download cancelled** |
| Download cancelled | "Model download cancelled. Live in browser is not ready." | Try again | Stay on Mock demo | **Mock demo** |
| Download failed | "Model download failed. Check your connection and try again." | Retry download | Stay on Mock demo | **Mock demo** |
| Model cached / ready | "Live in browser is ready. Generation runs locally on your device." | Generate Capture Layer | Switch to Mock demo | User may switch to **Mock demo** at any time |
| Generating Capture Layer | "Generating Capture Layer… This may take a minute in your browser." | Cancel | — | Cancel → preserve input; return to **Model cached / ready** |
| Capture Layer JSON retry | "Capture Layer JSON was invalid. Retrying once…" | Cancel | — | After retry failure → **Capture Layer failed** |
| Capture Layer failed | "Could not generate a valid Capture Layer. Your notes are unchanged." | Try again | Use Mock demo | **Mock demo** or retry same mode |
| Generating Decision Brief | "Generating Decision Brief from Capture Layer…" | Cancel | — | Cancel → preserve Capture Layer; return to review step |
| Decision Brief failed | "Decision Brief generation failed. Your Capture Layer is preserved." | Try again | Use Mock demo | Retry brief step or **Mock demo** |
| Complete | "Decision Brief ready for review and export." | Review output | Generate another (same mode) | User may switch mode before next run |
| Fall back to mock | "Switched to **Mock demo**." | Generate Capture Layer | Switch back to Live in browser | **Mock demo** |

### Progress and cancellation rules

- Show step-level progress for download and for each pipeline step (Capture Layer, then Decision Brief).
- Do not show streaming token output.
- Cancel during download aborts the fetch and returns to **Download cancelled**.
- Cancel during generation aborts in-flight inference without committing partial Capture Layer output.
- Capture Layer JSON gets one automatic repair retry before **Capture Layer failed** (aligned with [adapter feasibility](../ai/browser-inference-adapter-feasibility.md)).
- Decision Brief gets one retry on empty output only.

## Error handling

Surface explicit, plain-language errors. Preserve session input and the last valid artifact.

| Error | User message direction | Recovery |
| --- | --- | --- |
| WebGPU unavailable | Browser unsupported copy | **Mock demo** |
| Model download failed | Download failed copy | Retry download or **Mock demo** |
| Model load timed out | "Model load timed out. Try again on a stable connection." | Retry or **Mock demo** |
| Insufficient memory | "This device may not have enough memory for live browser generation." | **Mock demo** |
| Capture Layer invalid after retry | Capture Layer failed copy | Retry generation or **Mock demo** |
| Decision Brief empty after retry | Decision Brief failed copy | Retry brief or **Mock demo** |
| Generation cancelled | "Generation cancelled." | Return to prior ready/review state |
| Storage quota exceeded | "Browser storage is full. Clear site data or free space, then try again." | **Mock demo** or retry after user action |

Never silently fall back to mock without telling the user when they opted into **Live in browser**.

## Data-handling copy

Use consistently in disclosure, settings help, and error surfaces:

- "Your notes are processed locally in the browser for **Live in browser** mode."
- "Decision Brief Engine does not send your notes to a hosted model API for this mode."
- "Model weights download from the model provider CDN configured by the browser runtime; inference runs on your device after download."
- "Clearing site data removes the cached model and requires a new download."

Do not claim zero network use after first load; only claim no hosted Decision Brief Engine inference API.

## Accessibility and clarity requirements

- Mode label must be programmatically associated with the generation settings control (`aria-labelledby` / visible label).
- Download and generation progress must be exposed to assistive tech (`role="progressbar"` or `aria-live="polite"` status region).
- Error messages must appear in an `aria-live` region and not rely on color alone.
- Primary and secondary actions must have descriptive button text (avoid "OK" alone).
- Percent complete should remain readable when indeterminate (announce "Downloading…" without false precision).
- Cancel actions must be keyboard reachable and confirm destructive cancel only when it aborts an in-flight download.
- Help text must be plain language; avoid WebGPU jargon in primary copy (optional "Learn more" for technical detail).

## Non-goals

This UX slice explicitly excludes:

- Model picker or multi-model switching in UI
- Streaming token UI
- Hosted inference or cloud generation mode
- Auth, billing, persistence, collaboration, analytics, or enterprise controls
- Mobile-first support (phone/tablet layouts and mobile WebGPU validation are out of scope)
- Automatic fallback from browser inference to Ollama
- Background model prefetch on app load
- "Reset model cache" in primary MVP flow (dev-only if ever added)

## Acceptance criteria for #60

[#60](https://github.com/this-side-down/decision-brief-engine/issues/60) is complete when the implementation:

- [ ] Implements every UX state in the table above with the specified primary, secondary, and fallback behavior
- [ ] Preserves **Mock demo** as the default for new users and new sessions
- [ ] Uses the user-facing mode labels defined here
- [ ] Runs preflight checks before enabling opt-in
- [ ] Shows first-run disclosure with all required copy elements before download
- [ ] Does not download model weights until the user confirms disclosure
- [ ] Surfaces download progress, cancellation, retry, and failure states
- [ ] Runs Capture Layer then Decision Brief as separate visible steps with cancel support
- [ ] Performs one Capture Layer JSON retry and one Decision Brief empty-output retry with visible retry state
- [ ] Preserves notes and last valid Capture Layer on failure
- [ ] Allows explicit fallback/switch to **Mock demo** from error and settings surfaces
- [ ] Meets accessibility requirements for labels, progress, and errors
- [ ] Does not add model picker, streaming token UI, hosted inference, or mobile-first scope
- [ ] Does not start until #59 is merged

## Related documents

- [ADR 0004: inference path decision brief](../decisions/0004-inference-path-decision-brief.md)
- [Browser model quality gate](../ai/browser-model-quality-gate.md)
- [Browser inference adapter feasibility](../ai/browser-inference-adapter-feasibility.md)
- [Browser model evaluation results](../../fixtures/evaluation/browser-model-results.md)
