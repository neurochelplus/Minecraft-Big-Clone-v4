import type { ChunkManagerState } from "../types";
import type { BurstTickLimits } from "./types";

export function resolveBurstLimits(
  state: ChunkManagerState,
  now: number,
  frameP95: number,
  frameP99: number,
): BurstTickLimits {
  const defaultEnsures = state.isIdle
    ? state.runtimeMaxEnsuresIdle
    : state.runtimeMaxEnsuresActive;
  const defaultLimits: BurstTickLimits = {
    ensuresPerTick: defaultEnsures,
    meshFinalizeBudgetMs: state.runtimeMeshFinalizeBudgetMs,
    meshFinalizeMaxPerTick: state.runtimeMeshFinalizeMaxPerTick,
    rebuildMaxPerTick: state.runtimeRebuildMax,
  };
  if (!state.adaptiveBurstEnabled) {
    if (state.adaptiveBurstActive) {
      state.adaptiveBurstActive = false;
      state.burstExitCount += 1;
    }
    return defaultLimits;
  }

  if (frameP99 > state.burstFrameP99HardCapMs) {
    if (state.adaptiveBurstActive) {
      state.adaptiveBurstActive = false;
      state.burstCooldownUntilMs = now + state.burstCooldownMs;
      state.burstExitCount += 1;
    }
    return defaultLimits;
  }

  const backlog = state.pendingChunks.length + state.pendingMeshBuilds.length;

  if (!state.adaptiveBurstActive) {
    const shouldEnter =
      now >= state.burstCooldownUntilMs &&
      state.queueNearLatencyMs >= state.burstEnterNearLatencyMs &&
      frameP95 <= state.burstEnterFrameP95Ms &&
      frameP99 <= state.burstFrameP99HardCapMs &&
      backlog >= 8;
    if (shouldEnter) {
      state.adaptiveBurstActive = true;
      state.burstHoldUntilMs = now + state.burstMinHoldMs;
      state.burstEnterCount += 1;
    }
  } else {
    const shouldExit =
      now >= state.burstHoldUntilMs &&
      (state.queueNearLatencyMs <= state.burstExitNearLatencyMs ||
        frameP95 >= state.burstExitFrameP95Ms);
    if (shouldExit) {
      state.adaptiveBurstActive = false;
      state.burstCooldownUntilMs = now + state.burstCooldownMs;
      state.burstExitCount += 1;
    }
  }

  if (!state.adaptiveBurstActive) {
    return defaultLimits;
  }

  const burstEnsures = state.isIdle ? state.burstEnsuresIdle : state.burstEnsuresActive;
  return {
    ensuresPerTick: burstEnsures,
    meshFinalizeBudgetMs: state.burstMeshFinalizeBudgetMs,
    meshFinalizeMaxPerTick: state.burstMeshFinalizeMaxPerTick,
    rebuildMaxPerTick: state.burstRebuildMaxPerTick,
  };
}
