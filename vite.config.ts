import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const ollamaProxyTarget =
    env.VITE_OLLAMA_HOST ?? "http://127.0.0.1:11434";

  return {
    plugins: [react(), tailwindcss()],
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
