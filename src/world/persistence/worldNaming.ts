import type { WorldRegistry } from "./types";

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
}

export function clampSeed(seed?: number): number {
  if (typeof seed !== "number" || Number.isNaN(seed)) {
    return randomSeed();
  }

  const normalized = Math.floor(seed);
  if (normalized < 0 || normalized > 0xffffffff) {
    return randomSeed();
  }

  return normalized >>> 0;
}

export function nextWorldName(existing: WorldRegistry): string {
  return `World ${existing.length + 1}`;
}
