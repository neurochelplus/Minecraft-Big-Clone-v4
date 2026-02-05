import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { ProfilerHook } from "../../contracts/profiler";
import type { ChunkManagerState } from "./types";
import { processChunkQueue } from "./ChunkGeneration";

function createProfilerRecorder() {
  const values: Record<string, number[]> = {};
  const profiler: ProfilerHook = {
    startSection: () => {},
    endSection: () => {},
    recordValue: (name: string, value: number) => {
      const list = values[name] ?? [];
      list.push(value);
      values[name] = list;
    },
  };
  return { profiler, values };
}

function createTestMesh(): THREE.Mesh {
  return new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
}

function createChunkState(
  pending: Array<{ cx: number; cz: number; enqueuedAt: number }>,
): ChunkManagerState {
  const { profiler } = createProfilerRecorder();
  const chunkData = new Map<string, Uint8Array>();
  for (const item of pending) {
    chunkData.set(`${item.cx},${item.cz}`, new Uint8Array(1));
  }
  return {
    perfProfileName: "smooth_desktop_v1",
    scene: new THREE.Scene(),
    chunkSize: 1,
    chunkHeight: 1,
    chunks: new Map(),
    chunksData: chunkData,
    chunksMeta: new Map(),
    dirtyChunks: new Set(),
    inFlightChunks: new Map(),
    lastCleanupAt: 0,
    cleanupIntervalMs: 2000,
    runtimeGenBudgetMs: 100,
    runtimeRebuildBudgetMs: 1.5,
    runtimeRebuildMax: 2,
    runtimeMeshFinalizeBudgetMs: 2,
    runtimeMeshFinalizeMaxPerTick: 1,
    runtimeMaxEnsuresActive: 1,
    runtimeMaxEnsuresIdle: 2,
    pendingChunks: [...pending],
    pendingSet: new Set(pending.map((item) => `${item.cx},${item.cz}`)),
    pendingMeshBuilds: [],
    desiredChunks: new Set(pending.map((item) => `${item.cx},${item.cz}`)),
    queueContext: { playerX: 0, playerZ: 0, viewX: 1, viewZ: 0 },
    queueNearLatencyMs: 0,
    nearLatencyTargetMs: 180,
    adaptiveBurstEnabled: false,
    adaptiveBurstActive: false,
    burstHoldUntilMs: 0,
    burstCooldownUntilMs: 0,
    frameP99Ms: 0,
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
    queueForwardBias: 4,
    maxPendingChunks: 200,
    processingQueue: false,
    meshFinalizeProcessing: false,
    rebuildQueue: [],
    rebuildSet: new Set(),
    maxRebuildQueue: 100,
    profiler,
    rebuildCountThisFrame: 0,
    lastUpdateAt: 0,
    frameSamples: [],
    frameSampleSize: 60,
    dynamicRadius: 0,
    radiusMode: "dynamic",
    lastRadiusAdjustAt: 0,
    radiusAdjustCooldownMs: 1000,
    radiusP95TargetMs: 16.67,
    radiusStableMs: 14,
    runtimeGenBudgetMinMs: 1,
    runtimeGenBudgetMaxMs: 4,
    runtimeGenBudgetStepMs: 0.5,
    runtimeRebuildBudgetMinMs: 0.5,
    runtimeRebuildBudgetMaxMs: 2,
    runtimeRebuildBudgetStepMs: 0.25,
    lastBudgetAdjustAt: 0,
    budgetAdjustCooldownMs: 1200,
    lastPlayerPos: new THREE.Vector3(),
    lastPlayerAtMs: 0,
    idleSinceMs: 0,
    isIdle: false,
    idleSpeedThreshold: 0.15,
    idleEnterDelayMs: 600,
    idleExitSpeedMultiplier: 2.5,
    idleRadiusDelta: -1,
    idlePendingLimit: 60,
    terrainGen: {} as never,
    chunkGenerator: {} as never,
    meshBuilder: {
      buildMesh: () => createTestMesh(),
      buildMeshFromData: () => createTestMesh(),
    } as never,
    persistence: {
      hasChunk: () => false,
      isLoading: () => false,
      loadChunk: async () => undefined,
    } as never,
    streamer: {} as never,
    workerPool: undefined,
    useWorkers: false,
    useWorkerMesh: false,
  };
}

describe("processChunkQueue", () => {
  it("honors ensure hard-cap per tick", async () => {
    const pending = [
      { cx: 0, cz: 0, enqueuedAt: 0 },
      { cx: 1, cz: 0, enqueuedAt: 0 },
      { cx: 2, cz: 0, enqueuedAt: 0 },
    ];
    const state = createChunkState(pending);
    const { values } = createProfilerRecorder();
    state.profiler = {
      startSection: () => {},
      endSection: () => {},
      recordValue: (name: string, value: number) => {
        const list = values[name] ?? [];
        list.push(value);
        values[name] = list;
      },
    };

    await processChunkQueue(state, 100);
    const perTick = values["queue.ensure.processed"] ?? [];
    expect(perTick.length).toBeGreaterThan(0);
    expect(Math.max(...perTick)).toBeLessThanOrEqual(1);
  });

  it("honors maxEnsuresOverride when provided", async () => {
    const pending = [
      { cx: 0, cz: 0, enqueuedAt: 0 },
      { cx: 1, cz: 0, enqueuedAt: 0 },
      { cx: 2, cz: 0, enqueuedAt: 0 },
      { cx: 3, cz: 0, enqueuedAt: 0 },
    ];
    const state = createChunkState(pending);
    const { values } = createProfilerRecorder();
    state.profiler = {
      startSection: () => {},
      endSection: () => {},
      recordValue: (name: string, value: number) => {
        const list = values[name] ?? [];
        list.push(value);
        values[name] = list;
      },
    };

    await processChunkQueue(state, 100, 2);
    const perTick = values["queue.ensure.processed"] ?? [];
    expect(perTick.length).toBeGreaterThan(0);
    expect(Math.max(...perTick)).toBeLessThanOrEqual(2);
  });

  it("prioritizes near chunks over far ones", async () => {
    const pending = [
      { cx: 3, cz: 0, enqueuedAt: 0 },
      { cx: 0, cz: 0, enqueuedAt: 0 },
      { cx: 1, cz: 0, enqueuedAt: 0 },
    ];
    const state = createChunkState(pending);
    await processChunkQueue(state, 100);

    const firstBuiltKey = state.chunks.keys().next().value as string | undefined;
    expect(firstBuiltKey).toBeDefined();
    expect(firstBuiltKey).not.toBe("3,0");
  });
});
