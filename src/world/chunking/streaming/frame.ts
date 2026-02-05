import type { ChunkManagerState } from "../types";
import { nowMs } from "../ChunkTiming";

export function sampleFrameTime(state: ChunkManagerState): void {
  const now = nowMs();
  if (state.lastUpdateAt > 0) {
    const delta = now - state.lastUpdateAt;
    state.frameSamples.push(delta);
    if (state.frameSamples.length > state.frameSampleSize) {
      state.frameSamples.splice(0, state.frameSamples.length - state.frameSampleSize);
    }
  }
  state.lastUpdateAt = now;
}

export function getFrameP95(state: ChunkManagerState): number {
  if (state.frameSamples.length === 0) return 0;
  const sorted = [...state.frameSamples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx] ?? sorted[sorted.length - 1];
}

export function getFrameP99(state: ChunkManagerState): number {
  if (state.frameSamples.length === 0) return 0;
  const sorted = [...state.frameSamples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.99) - 1);
  return sorted[idx] ?? sorted[sorted.length - 1];
}
