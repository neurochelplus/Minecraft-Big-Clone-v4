export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function readNumericLocalStorage(key: string): number | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function getStartupPregenRadius(defaultRadius: number, isMobile: boolean): number {
  const fallback = isMobile ? Math.min(defaultRadius, 4) : defaultRadius;
  const value = readNumericLocalStorage("qf-pregen-radius");
  if (value === undefined) return fallback;
  return clamp(Math.round(value), 2, 8);
}

export function getStartupPregenBudgetMs(defaultBudgetMs: number, isMobile: boolean): number {
  const fallback = isMobile ? Math.min(defaultBudgetMs, 2.5) : defaultBudgetMs;
  const value = readNumericLocalStorage("qf-pregen-budget-ms");
  if (value === undefined) return fallback;
  return clamp(value, 1, 12);
}
