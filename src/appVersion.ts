export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION ?? "0.0.0";
}

export function formatAppVersionLabel(version = getAppVersion()): string {
  return `v${version} demo`;
}
