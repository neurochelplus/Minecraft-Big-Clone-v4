export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function pressureClass(ratio: number): "good" | "warn" | "bad" {
  if (ratio >= 1.05) return "bad";
  if (ratio >= 0.9) return "warn";
  return "good";
}

export function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function formatNumber(value: number, digits: number): string {
  return safeNumber(value).toFixed(digits);
}

export function formatMs(value: number): string {
  return `${formatNumber(value, 2)} ms`;
}
