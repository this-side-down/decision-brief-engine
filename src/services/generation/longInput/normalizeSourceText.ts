export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function normalizeSourceText(rawInputText: string): string {
  return normalizeNewlines(rawInputText.trim());
}
