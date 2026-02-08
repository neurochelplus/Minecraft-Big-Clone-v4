import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { ProfilerHook } from "../../contracts/profiler";
import type { ChunkMeshData } from "../../contracts/chunks";
import type { ChunkManagerState } from "./types";
import { processMeshFinalizeQueue } from "./ChunkMeshing";

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

function createMeshData(): ChunkMeshData {
  return {
    positions: new Float32Array([0, 0, 0]),
    normals: new Float32Array([0, 1, 0]),
    uvs: new Float32Array([0, 0]),
    colors: new Float32Array([1, 1, 1]),
    indices: new Uint32Array([0]),
  };
}

function createFinalizeState(buildDelayMs = 0): {
  state: ChunkManagerState;
  values: Record<string, number[]>;
} {
  const { profiler, values } = createProfilerRecorder();
  const busyWait = () => {
    if (buildDelayMs <= 0) return;
    const end = Date.now() + buildDelayMs;
    while (Date.now() < end) {
      // busy wait for deterministic budget test
    }
  };

  const state: ChunkManagerState = {
    perfProfileName: "smooth_desktop_v1",
    scene: new THREE.Scene(),
    chunkSize: 1,
    chunkHeight: 1,
    chunks: new Map(),
    chunksData: new Map([
      ["0,0", new Uint8Array(1)],
      ["1,0", new Uint8Array(1)],
    ]),
    chunksMeta: new Map(),
    dirtyChunks: new Set(),
    inFlightChunks: new Map(),
    lastCleanupAt: 0,
    cleanupIntervalMs: 2000,
    runtimeGenBudgetMs: 2.5,
    runtimeRebuildBudgetMs: 1.5,
    runtimeRebuildMax: 2,
    runtimeMeshFinalizeBudgetMs: 2,
    runtimeMeshFinalizeMaxPerTick: 1,
    runtimeMaxEnsuresActive: 1,
    runtimeMaxEnsuresIdle: 2,
    pendingChunks: [],
    pendingSet: new Set(),
    pendingMeshBuilds: [
      { cx: 0, cz: 0, meshData: createMeshData(), enqueuedAt: 0 },
      { cx: 1, cz: 0, meshData: createMeshData(), enqueuedAt: 0 },
    ],
    desiredChunks: new Set(["0,0", "1,0"]),
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
      buildMesh: () =>
        new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()),
      buildMeshFromData: () => {
        busyWait();
        return new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial(),
        );
      },
    } as never,
    persistence: {} as never,
    streamer: {} as never,
    workerPool: undefined,
    useWorkers: false,
    useWorkerMesh: true,
  };

  return { state, values };
}

describe("processMeshFinalizeQueue", () => {
  it("respects maxPerTick and updates pending queue", async () => {
    const { state, values } = createFinalizeState();
    await processMeshFinalizeQueue(state, 100, 1);

    expect(state.chunks.size).toBe(1);
    expect(state.pendingMeshBuilds.length).toBe(1);
    const processed = values["queue.mesh.processed"] ?? [];
    expect(processed[processed.length - 1]).toBe(1);
  });

  it("respects budget guard and does not drain queue in one tick", async () => {
    const { state, values } = createFinalizeState(3);
    await processMeshFinalizeQueue(state, 0.1, 10);

    expect(state.chunks.size).toBe(1);
    expect(state.pendingMeshBuilds.length).toBe(1);
    const processed = values["queue.mesh.processed"] ?? [];
    expect(processed[processed.length - 1]).toBe(1);
  });
});
