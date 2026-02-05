import type { ChunkManagerState } from "../types";
import { nowMs } from "../ChunkTiming";
import { getFrameP95 } from "./frame";

export function getRadiusMode(): "dynamic" | "fixed" {
  try {
    const mode = localStorage.getItem("qf-stream-radius-mode");
    if (mode === "fixed") return "fixed";
  } catch {
    return "dynamic";
  }
  return "dynamic";
}

export function getStreamingRadius(state: ChunkManagerState, isMobile: boolean): number {
  const baseRadius = isMobile ? 2 : 3;
  if (state.radiusMode === "fixed") {
    return baseRadius;
  }
  const effectiveBase = Math.max(1, baseRadius + (state.isIdle ? state.idleRadiusDelta : 0));
  const minRadius = effectiveBase;
  const maxRadius = effectiveBase + 1;
  if (state.dynamicRadius === 0) {
    state.dynamicRadius = effectiveBase;
  }
  const p95 = getFrameP95(state);
  const now = nowMs();
  if (
    p95 > state.radiusP95TargetMs &&
    state.dynamicRadius > minRadius &&
    now - state.lastRadiusAdjustAt > state.radiusAdjustCooldownMs
  ) {
    state.dynamicRadius -= 1;
    state.lastRadiusAdjustAt = now;
  } else if (
    p95 > 0 &&
    p95 < state.radiusStableMs &&
    state.dynamicRadius < maxRadius &&
    now - state.lastRadiusAdjustAt > state.radiusAdjustCooldownMs
  ) {
    state.dynamicRadius += 1;
    state.lastRadiusAdjustAt = now;
  }
  return state.dynamicRadius;
}
