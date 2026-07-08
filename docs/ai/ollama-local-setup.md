# Local Ollama setup and health check

Use this guide to validate local Ollama inference on a new machine. The public hosted demo stays on Mock mode; this path is for local development and evaluation only.

## Quick validation

```sh
npm run health:ollama
```

The health check reports:

- configured Ollama host/endpoint
- configured model name
- endpoint reachability
- model availability
- a short generation smoke test (skip with `--no-smoke`)

Machine-readable output:

```sh
npm run health:ollama -- --json
```

## Mac setup

1. Install [Ollama](https://ollama.com/download).
2. Start Ollama and confirm the app or background service is running.
3. Pull the default model:

   ```sh
   ollama pull qwen3:4b
   ```

4. Copy `.env.example` to `.env.local` and set:

   ```sh
   VITE_GENERATION_MODE=ollama
   VITE_OLLAMA_BASE_URL=/ollama
   VITE_OLLAMA_MODEL=qwen3:4b
   VITE_OLLAMA_HOST=http://127.0.0.1:11434
   ```

5. Run the health check:

   ```sh
   npm run health:ollama
   ```

6. Start the app:

   ```sh
   npm run dev
   ```

The Vite dev server proxies `/ollama` to `VITE_OLLAMA_HOST`.

## Windows setup

1. Install [Ollama for Windows](https://ollama.com/download).
2. Start Ollama from the Start menu or tray icon.
3. Pull the model in PowerShell or Command Prompt:

   ```sh
   ollama pull qwen3:4b
   ```

4. Copy `.env.example` to `.env.local` and set the same values as Mac. Windows local dev usually uses:

   ```sh
   VITE_OLLAMA_HOST=http://127.0.0.1:11434
   ```

5. Run `npm run health:ollama`, then `npm run dev`.

If you run the app inside WSL or a devcontainer while Ollama runs on the Windows host, point `VITE_OLLAMA_HOST` at `http://host.docker.internal:11434` instead.

## Local smoke-test checklist

Use this after setup or when troubleshooting.

- [ ] `ollama list` shows `qwen3:4b` (or your configured model)
- [ ] `npm run health:ollama` reports `READY`
- [ ] `npm run dev` starts without proxy errors
- [ ] In Ollama mode, Capture Layer generation completes in the app
- [ ] `npm run eval:capture -- --mode=ollama` passes schema and structural gates

For a faster preflight without generation:

```sh
npm run health:ollama -- --no-smoke
```

## Common failures

| Symptom | Likely cause | What to fix |
| --- | --- | --- |
| Endpoint not reachable | Ollama is not running | Start Ollama, then retry |
| Endpoint not reachable | Wrong host/port or proxy target | Check `VITE_OLLAMA_BASE_URL` and `VITE_OLLAMA_HOST` |
| Model not available | Model not pulled | Run `ollama pull <model>` |
| Generation timed out | Model still loading or machine is slow | Wait and retry, or increase `VITE_OLLAMA_TIMEOUT_MS` |
| Invalid response | Model/runtime quirk or bad output | Try `ollama run <model>` directly; see [ollama-qwen3-json-quirk.md](./ollama-qwen3-json-quirk.md) |
| Config malformed | Empty or invalid env value | Fix `.env.local` values and restart the dev server |

## Related docs

- [Qwen3 / Ollama JSON-mode quirk](./ollama-qwen3-json-quirk.md)
- [Capture Layer evaluation harness](./capture-layer-eval-harness.md)
- [Live browser inference UX](../product/live-browser-inference-ux.md)
