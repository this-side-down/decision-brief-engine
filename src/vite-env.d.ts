/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_WEBGPU_INFERENCE?: string;
  readonly VITE_GENERATION_MODE?: string;
  readonly VITE_OLLAMA_BASE_URL?: string;
  readonly VITE_OLLAMA_MODEL?: string;
  readonly VITE_OLLAMA_TIMEOUT_MS?: string;
  readonly VITE_WEBGPU_MODEL_ID?: string;
  readonly VITE_WEBGPU_TIMEOUT_MS?: string;
  /** Experimental Capture Layer prompt variant for local eval only. */
  readonly VITE_CAPTURE_PROMPT_VARIANT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
