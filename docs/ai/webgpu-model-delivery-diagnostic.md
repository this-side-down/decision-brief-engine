# WebGPU model delivery diagnostic (#124)

Local-only investigation harness for browser WebLLM weight delivery. This script is **not** exposed in the public product UI.

## When to use

Run this when a gated WebGPU build fails during model download with errors such as:

- `Failed to execute 'add' on 'Cache': Request failed`
- repeated `403 Forbidden` responses on redirected shard requests
- model load never reaches `model_ready`

## Command

```bash
npm run diagnose:webgpu-model
npm run diagnose:webgpu-model -- --json
npm run diagnose:webgpu-model -- --model Qwen2.5-1.5B-Instruct-q4f16_1-MLC --compare Llama-3.2-1B-Instruct-q4f16_1-MLC
```

The script reports:

- installed `@mlc-ai/web-llm` version
- selected model ID from app config (`VITE_WEBGPU_MODEL_ID` when set in the shell/build env)
- resolved `model` and `model_lib` URLs from the installed prebuilt WebLLM app config
- default cache backend (`cache`, unless overridden in app config)
- initial shard URL, redirect host, signed URL status, and direct fetch status
- whether Cache.add isolation is applicable (only when direct fetch succeeds)
- redacted signed URLs (query parameters removed)

Exit code `1` means at least one probe could not fetch shard bytes successfully.

## Confirmed root cause (2026-07-13)

Category: **environment-wide upstream delivery failure** (Outcome D).

Evidence:

| Check | Result |
| --- | --- |
| Installed WebLLM version | `0.2.84` (latest npm) |
| Installed model record for `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | Matches upstream WebLLM prebuilt config |
| `model` URL | Valid Hugging Face repo |
| `model_lib` URL | HTTP 200 from GitHub raw |
| Small artifacts (`tokenizer.json`, `mlc-chat-config.json`) | HTTP 200/206 |
| Large shard files (`params_shard_*.bin`) | HTTP 302 → `cas-bridge.xethub.hf.co` → HTTP 403 |
| Comparison model `Llama-3.2-1B-Instruct-q4f16_1-MLC` | Same 302 → Xet → 403 pattern |
| HF model API metadata | Shards are Xet-backed (`xetHash` present) |
| Browser Cache backend | Default `cache`; not the root cause because direct fetch already returns 403 |

The visible WebLLM `Cache.add` error is a downstream symptom of the failed shard network response. Changing cache backend, swapping to another supported small WebLLM model, or overriding the app model record would not fix this symptom while Xet signed delivery returns 403.

W2 succeeded on 2026-07-08 on the same benchmark machine; W3 failed on 2026-07-13 with the same model ID and WebLLM version, which is consistent with a recent upstream Hugging Face / Xet delivery regression rather than an outdated app record.

## Minimal upstream reproduction

Use any HTTP client that follows redirects manually:

1. Request `https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_0.bin` with `Range: bytes=0-1023`.
2. Observe `302` to `https://cas-bridge.xethub.hf.co/...`
3. Request the signed location with the same `Range` header.
4. Observe `403 Forbidden`.

Repeat with `https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC/resolve/main/params_shard_0.bin` to confirm the failure is not model-record-specific.

Do **not** log or share full signed URLs; redact query parameters in reports.

## Product posture while blocked

- WebGPU inference remains gated behind `VITE_ENABLE_WEBGPU_INFERENCE=true`
- Mock demo remains the public default
- No proxying, URL rewriting, or self-hosting of model weights in the app
- W3 manual validation remains **pending** until upstream shard delivery succeeds

## Related

- [#124](https://github.com/this-side-down/decision-brief-engine/issues/124)
- [Browser model results](../../fixtures/evaluation/browser-model-results.md)
- [Browser model / prompt variant eval](browser-model-prompt-variant-eval.md)
