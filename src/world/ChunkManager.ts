import * as THREE from "three";
import type { IFurnaceManager } from "../contracts/crafting";
import type { ProfilerHook } from "../contracts/profiler";
import { TerrainGenerator } from "./TerrainGenerator";
import { ChunkMeshBuilder } from "./ChunkMeshBuilder";
import { ChunkPersistence } from "./ChunkPersistence";
import { ChunkStreamer } from "./streaming/ChunkStreamer";
import { getPerfProfile, getPerfProfileName } from "./perf/PerfProfile";
import type { ChunkManagerState } from "./chunking/types";
import {
  createChunkGenerator,
  preGenerateAround as preGenerateAroundChunks,
  setupWorkers,
} from "./chunking/ChunkGeneration";
import { getRadiusMode, updateStreaming } from "./chunking/ChunkStreaming";
import {
  clear as clearChunks,
  dispose as disposeChunks,
  getBlock as getBlockFromStorage,
  getTopY as getTopYFromStorage,
  hasBlock as hasBlockFromStorage,
  isChunkLoaded as isChunkLoadedFromStorage,
  loadChunk as loadChunkFromStorage,
  saveDirtyChunks as saveDirtyChunksFromStorage,
  setBlock as setBlockInStorage,
  waitForChunk as waitForChunkFromStorage,
} from "./chunking/ChunkStorage";

export class ChunkManager {
  private state: ChunkManagerState;

  constructor(scene: THREE.Scene, seed?: number, furnaceManager?: IFurnaceManager) {
    const chunkSize = 32;
    const chunkHeight = 128;
    const perfProfileName = getPerfProfileName();
    const perfProfile = getPerfProfile();
    const initialSeed = seed ?? Math.floor(Math.random() * 2147483647);
    const terrainGen = new TerrainGenerator(initialSeed);
    const chunkGenerator = createChunkGenerator(initialSeed, {
      chunkSize,
      chunkHeight,
      terrainGen,
    });
    const meshBuilder = new ChunkMeshBuilder(furnaceManager);
    const persistence = new ChunkPersistence();
    const streamer = new ChunkStreamer();

    this.state = {
      perfProfileName,
      scene,
      chunkSize,
      chunkHeight,
      chunks: new Map(),
      chunksData: new Map(),
      chunksMeta: new Map(),
      dirtyChunks: new Set(),
      inFlightChunks: new Map(),
      lastCleanupAt: 0,
      cleanupIntervalMs: 2000,
      runtimeGenBudgetMs: 2.5,
      runtimeRebuildBudgetMs: 1.5,
      runtimeRebuildMax: perfProfile.runtimeRebuildMaxPerTick,
      runtimeMeshFinalizeBudgetMs: perfProfile.runtimeMeshFinalizeBudgetMs,
      runtimeMeshFinalizeMaxPerTick: perfProfile.runtimeMeshFinalizeMaxPerTick,
      runtimeMaxEnsuresActive: perfProfile.runtimeMaxEnsuresActive,
      runtimeMaxEnsuresIdle: perfProfile.runtimeMaxEnsuresIdle,
      pendingChunks: [],
      pendingSet: new Set(),
      pendingMeshBuilds: [],
      desiredChunks: new Set(),
      queueContext: null,
      queueNearLatencyMs: 0,
      nearLatencyTargetMs: perfProfile.nearLatencyTargetMs,
      adaptiveBurstEnabled: perfProfile.adaptiveBurstEnabled,
      adaptiveBurstActive: false,
      burstHoldUntilMs: 0,
      burstCooldownUntilMs: 0,
      frameP99Ms: 0,
      burstEnterCount: 0,
      burstExitCount: 0,
      burstEnterNearLatencyMs: perfProfile.burstEnterNearLatencyMs,
      burstExitNearLatencyMs: perfProfile.burstExitNearLatencyMs,
      burstEnterFrameP95Ms: perfProfile.burstEnterFrameP95Ms,
      burstExitFrameP95Ms: perfProfile.burstExitFrameP95Ms,
      burstFrameP99HardCapMs: perfProfile.burstFrameP99HardCapMs,
      burstEnsuresActive: perfProfile.burstEnsuresActive,
      burstEnsuresIdle: perfProfile.burstEnsuresIdle,
      burstMeshFinalizeBudgetMs: perfProfile.burstMeshFinalizeBudgetMs,
      burstMeshFinalizeMaxPerTick: perfProfile.burstMeshFinalizeMaxPerTick,
      burstRebuildMaxPerTick: perfProfile.burstRebuildMaxPerTick,
      burstMinHoldMs: perfProfile.burstMinHoldMs,
      burstCooldownMs: perfProfile.burstCooldownMs,
      queueForwardBias: chunkSize * 4,
      maxPendingChunks: 200,
      processingQueue: false,
      meshFinalizeProcessing: false,
      rebuildQueue: [],
      rebuildSet: new Set(),
      maxRebuildQueue: 100,
      profiler: null,
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
      terrainGen,
      chunkGenerator,
      meshBuilder,
      persistence,
      streamer,
      workerPool: undefined,
      useWorkers: false,
      useWorkerMesh: false,
    };

    setupWorkers(this.state);
    this.state.radiusMode = getRadiusMode();
  }

  public async init(): Promise<void> {
    await this.state.persistence.init();
  }

  public getSeed(): number {
    return this.state.chunkGenerator.getSeed();
  }

  public setSeed(seed: number) {
    this.state.terrainGen.setSeed(seed);
    this.state.chunkGenerator = createChunkGenerator(seed, {
      chunkSize: this.state.chunkSize,
      chunkHeight: this.state.chunkHeight,
      terrainGen: this.state.terrainGen,
    });
  }

  public getNoiseTexture(): THREE.DataTexture {
    return this.state.meshBuilder.getNoiseTexture();
  }

  public update(
    playerPos: THREE.Vector3,
    viewDir?: THREE.Vector3,
    profiler?: ProfilerHook,
  ) {
    updateStreaming(this.state, playerPos, viewDir, profiler);
  }

  public async preGenerateAround(
    spawnX: number,
    spawnZ: number,
    radius: number,
    options?: { budgetMs?: number; onProgress?: (progress: number) => void },
  ): Promise<void> {
    await preGenerateAroundChunks(this.state, spawnX, spawnZ, radius, options);
  }

  public getBlock(x: number, y: number, z: number): number {
    return getBlockFromStorage(this.state, x, y, z);
  }

  public setBlock(x: number, y: number, z: number, type: number) {
    setBlockInStorage(this.state, x, y, z, type);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    return hasBlockFromStorage(this.state, x, y, z);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    return isChunkLoadedFromStorage(this.state, x, z);
  }

  public getTopY(worldX: number, worldZ: number): number {
    return getTopYFromStorage(this.state, worldX, worldZ);
  }

  public async loadChunk(cx: number, cz: number) {
    await loadChunkFromStorage(this.state, cx, cz);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    return waitForChunkFromStorage(this.state, cx, cz);
  }

  public async saveDirtyChunks(): Promise<void> {
    await saveDirtyChunksFromStorage(this.state);
  }

  public async clear() {
    await clearChunks(this.state, (seed) => this.setSeed(seed));
  }

  public dispose(): void {
    disposeChunks(this.state);
  }
}
