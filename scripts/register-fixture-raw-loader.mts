/**
 * Node custom loader so eval CLIs can import Vite-style `*.md?raw` fixtures
 * under tsx without changing product fixture modules.
 *
 * Must stay synchronous: tsx resolves these imports on the sync loader path.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function stripRawQuery(url: string): string {
  return url.replace(/\?raw$/, "");
}

function isMarkdownSpecifier(specifier: string): boolean {
  return specifier.endsWith(".md?raw") || specifier.endsWith(".md");
}

export function resolve(
  specifier: string,
  context: { parentURL?: string },
  nextResolve: (
    specifier: string,
    context: { parentURL?: string },
  ) => { url: string; shortCircuit?: boolean },
) {
  if (!isMarkdownSpecifier(specifier)) {
    return nextResolve(specifier, context);
  }

  const parent = context.parentURL
    ? fileURLToPath(stripRawQuery(context.parentURL))
    : process.cwd();
  const absolute = resolvePath(dirname(parent), specifier.replace(/\?raw$/, ""));
  return {
    shortCircuit: true,
    url: `${pathToFileURL(absolute).href}?raw`,
  };
}

export function load(
  url: string,
  context: unknown,
  nextLoad: (
    url: string,
    context: unknown,
  ) => { format: string; source?: string; shortCircuit?: boolean },
) {
  if (!url.includes(".md")) {
    return nextLoad(url, context);
  }

  const path = fileURLToPath(stripRawQuery(url));
  const source = readFileSync(path, "utf8");
  return {
    format: "module",
    shortCircuit: true,
    source: `export default ${JSON.stringify(source)};\n`,
  };
}
