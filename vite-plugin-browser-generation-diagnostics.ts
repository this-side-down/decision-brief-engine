import type { Connect } from "vite";
import type { Plugin } from "vite";
import {
  BROWSER_GENERATION_DIAGNOSTICS_ENV,
} from "./src/services/generation/browserGenerationDiagnostics";
import { writeBrowserGenerationDiagnosticArtifactToDirectory } from "./src/services/generation/browserGenerationLocalCapture.node";

function createDiagnosticsMiddleware(root: string): Connect.NextHandleFunction {
  return async (request, response, next) => {
    if (process.env[BROWSER_GENERATION_DIAGNOSTICS_ENV] !== "true") {
      response.statusCode = 404;
      response.end("Browser generation diagnostics are disabled.");
      return;
    }

    if (request.method !== "POST") {
      next();
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }

      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        filename?: string;
        artifact?: unknown;
      };

      if (typeof payload.filename !== "string" || payload.artifact === undefined) {
        response.statusCode = 400;
        response.end("Invalid diagnostic payload.");
        return;
      }

      const filePath = writeBrowserGenerationDiagnosticArtifactToDirectory({
        repoRoot: root,
        filename: payload.filename,
        artifact: payload.artifact as never,
      });

      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ filePath }));
    } catch (error) {
      response.statusCode = 500;
      response.end(
        error instanceof Error ? error.message : "Diagnostic write failed.",
      );
    }
  };
}

export function browserGenerationDiagnosticsPlugin(): Plugin {
  let root = process.cwd();

  return {
    name: "browser-generation-diagnostics",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(
        "/__browser-generation-diagnostics/write",
        createDiagnosticsMiddleware(root),
      );
    },
    configurePreviewServer(server) {
      server.middlewares.use(
        "/__browser-generation-diagnostics/write",
        createDiagnosticsMiddleware(root),
      );
    },
  };
}
