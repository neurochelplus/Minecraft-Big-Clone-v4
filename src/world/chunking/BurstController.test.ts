import { describe, expect, it } from "vitest";
import type { ChunkManagerState } from "./types";
import { resolveBurstLimits } from "./ChunkStreaming";

function createState(
  overrides: Partial<ChunkManagerState> = {},
): ChunkManagerState {
  return {
    isIdle: false,
    runtimeMaxEnsuresActive: 2,
    runtimeMaxEnsuresIdle: 3,
    runtimeMeshFinalizeBudgetMs: 2.5,
    runtimeMeshFinalizeMaxPerTick: 2,
    runtimeRebuildMax: 2,
    adaptiveBurstEnabled: true,
    adaptiveBurstActive: false,
    burstHoldUntilMs: 0,
    burstCooldownUntilMs: 0,
    burstEnterCount: 0,
    burstExitCount: 0,
    burstEnterNearLatencyMs: 320,
    burstExitNearLatencyMs: 190,
    burstEnterFrameP95Ms: 11.5,
    burstExitFrameP95Ms: 14,
    burstFrameP99HardCapMs: 16.67,
    burstEnsuresActive: 3,
    burstEnsuresIdle: 4,
    burstMeshFinalizeBudgetMs: 3,
    burstMeshFinalizeMaxPerTick: 3,
    burstRebuildMaxPerTick: 1,
    burstMinHoldMs: 600,
    burstCooldownMs: 900,
    queueNearLatencyMs: 0,
    pendingChunks: [],
    pendingMeshBuilds: [],
    ...overrides,
  } as unknown as ChunkManagerState;
}

describe("resolveBurstLimits", () => {
  it("enters burst when near latency is high and frame is safe", () => {
    const state = createState({
      queueNearLatencyMs: 360,
      pendingChunks: new Array(8).fill({ cx: 0, cz: 0, enqueuedAt: 0 }),
    });
    const limits = resolveBurstLimits(state, 1000, 10.5, 15.2);

    expect(state.adaptiveBurstActive).toBe(true);
    expect(state.burstEnterCount).toBe(1);
    expect(state.burstHoldUntilMs).toBe(1600);
    expect(limits.ensuresPerTick).toBe(3);
    expect(limits.meshFinalizeMaxPerTick).toBe(3);
  });

  it("exits burst after hold when near latency drops", () => {
    const state = createState({
      adaptiveBurstActive: true,
      burstHoldUntilMs: 1600,
      queueNearLatencyMs: 180,
    });

    resolveBurstLimits(state, 1500, 10.2, 15.1);
    expect(state.adaptiveBurstActive).toBe(true);

    const limits = resolveBurstLimits(state, 1600, 10.2, 15.1);
    expect(state.adaptiveBurstActive).toBe(false);
    expect(state.burstExitCount).toBe(1);
    expect(state.burstCooldownUntilMs).toBe(2500);
    expect(limits.ensuresPerTick).toBe(2);
  });

  it("forces burst off when frame p99 exceeds hard cap", () => {
    const state = createState({
      adaptiveBurstActive: true,
      burstHoldUntilMs: 1900,
      queueNearLatencyMs: 400,
    });

    const limits = resolveBurstLimits(state, 1200, 10, 18.5);
    expect(state.adaptiveBurstActive).toBe(false);
    expect(state.burstExitCount).toBe(1);
    expect(state.burstCooldownUntilMs).toBe(2100);
    expect(limits.ensuresPerTick).toBe(2);
  });

  it("respects cooldown before re-entering burst", () => {
    const state = createState({
      queueNearLatencyMs: 360,
      pendingChunks: new Array(8).fill({ cx: 0, cz: 0, enqueuedAt: 0 }),
      burstCooldownUntilMs: 2500,
    });

    resolveBurstLimits(state, 2000, 10.5, 15.3);
    expect(state.adaptiveBurstActive).toBe(false);

    resolveBurstLimits(state, 2500, 10.5, 15.3);
    expect(state.adaptiveBurstActive).toBe(true);
    expect(state.burstEnterCount).toBe(1);
  });
});
