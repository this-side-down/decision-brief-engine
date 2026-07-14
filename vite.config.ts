import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import pkg from "./package.json";
import { browserGenerationDiagnosticsPlugin } from "./vite-plugin-browser-generation-diagnostics";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const ollamaProxyTarget =
    env.VITE_OLLAMA_HOST ?? "http://127.0.0.1:11434";

  return {
    plugins: [react(), tailwindcss(), browserGenerationDiagnosticsPlugin()],
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
    },
    optimizeDeps: {
      exclude: ["@mlc-ai/web-llm"],
    },
    build: {
      chunkSizeWarningLimit: 2000,
    },
    server: {
      proxy: {
        "/ollama": {
          target: ollamaProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ollama/, ""),
        },
      },
    },
  };
});
