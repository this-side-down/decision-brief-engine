# Qwen3 / Ollama JSON-mode quirk

## Summary

When using Ollama with `qwen3:4b` and `format: "json"`, the model may return valid Capture Layer JSON in the `thinking` field while leaving `response` empty.

This behavior was observed locally with:

- model: `qwen3:4b`
- endpoint: Ollama `/api/generate`
- `stream: false`
- `format: "json"`

## What does not fix it

Prefixing the prompt with `/no_think` did **not** move JSON into `response`. The adapter must not rely on `/no_think`.

Prompts should still include:

> Do not include reasoning. Return only the final JSON object.

That instruction reduces unwanted reasoning in output when models honor it, but it is not sufficient on its own for Qwen3 in Ollama JSON mode.

## Adapter behavior

The Ollama adapter extracts model text as follows:

1. Use `response.response` when it is non-empty after trimming.
2. If `response.response` is empty, use `response.thinking` when it is non-empty after trimming.
3. Parse and validate the extracted text as Capture Layer JSON.
4. Never display `thinking` in the UI.
5. Never persist `thinking` in session state or exported artifacts.

Implementation: `src/services/generation/extractOllamaText.ts`.

## Decision Brief generation

Decision Brief generation does not use `format: "json"`. The same `response` → `thinking` fallback is still used so a model that emits Markdown only in `thinking` can be handled consistently. Only the extracted final text is returned to the UI.

## Operational notes

- Default browser base URL is `VITE_OLLAMA_BASE_URL=/ollama`. The Vite dev server proxies `/ollama` to the Ollama host configured by `VITE_OLLAMA_HOST`.
- Default proxy target is `http://127.0.0.1:11434` when `VITE_OLLAMA_HOST` is unset.
- Windows local dev usually uses `http://127.0.0.1:11434`.
- Devcontainer/container users may need `http://host.docker.internal:11434`.
- Override `VITE_OLLAMA_BASE_URL` only when the app should call Ollama directly instead of through the dev proxy.
- This quirk is model/runtime specific; other Ollama models may populate `response` normally.
