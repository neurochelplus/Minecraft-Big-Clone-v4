import * as THREE from "three";
import { ChunkPersistence } from "./ChunkPersistence";
import { ChunkGenerationQueue } from "./ChunkGenerationQueue";
import { ChunkDataManager } from "./ChunkDataManager";
import { ChunkMeshManager } from "./ChunkMeshManager";
import type { ChunkMesh } from "./ChunkMeshManager";
import type { BiomeId } from "../generation/runtime/BiomeRegistry";
import {
  WORLD_GEN_PRESET_LEGACY,
  normalizeWorldGenPresetId,
  type WorldGenPresetId,
} from "../generation/WorldGenPresets";

export class ChunkLoader {
  private chunkSize: number;
  private chunkHeight: number;

  private persistence: ChunkPersistence;
  private generationQueue: ChunkGenerationQueue;
  private dataManager: ChunkDataManager;
  private meshManager: ChunkMeshManager;

  private pendingMeshRebuilds: Set<string> = new Set();
  private rebuildCounter: number = 0;
  private readonly REBUILD_INTERVAL: number = 2;
  private worldId: string = "default";
  private seed: number;
  private presetId: WorldGenPresetId;

  constructor(
    scene: THREE.Scene,
    chunkSize: number,
    chunkHeight: number,
    seed?: number,
    presetId: WorldGenPresetId = WORLD_GEN_PRESET_LEGACY,
  ) {
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
    this.seed = seed ?? 0;
    this.presetId = presetId;

    this.persistence = new ChunkPersistence();
    this.generationQueue = new ChunkGenerationQueue(
      this.persistence,
      chunkSize,
      chunkHeight,
      this.seed,
      this.presetId,
    );
    this.dataManager = new ChunkDataManager(
      chunkSize,
      chunkHeight,
      (worldX: number, worldZ: number) =>
        this.generationQueue.getTerrainHeight(worldX, worldZ),
    );
    this.meshManager = new ChunkMeshManager(scene, chunkSize, chunkHeight);
  }

  public async init(): Promise<void> {
    this.persistence.setWorldId(this.worldId);
    await this.persistence.init();
  }

  public getWorldId(): string {
    return this.worldId;
  }

  public async switchWorld(
    worldId: string,
    seed: number,
    presetId: WorldGenPresetId,
  ): Promise<void> {
    this.worldId = worldId;
    this.persistence.setWorldId(worldId);
    this.clearInMemory();
    this.setGenerationContext(seed, presetId);
    await this.persistence.init();
  }

  public getSeed(): number {
    return this.seed;
  }

  public setSeed(seed: number): void {
    this.setGenerationContext(seed, this.presetId);
  }

  public setGenerationContext(seed: number, presetId: string): void {
    this.seed = seed;
    this.presetId = normalizeWorldGenPresetId(presetId);
    this.generationQueue.setGenerationContext(this.seed, this.presetId);
  }

  public getNoiseTexture(): THREE.DataTexture {
    return this.meshManager.getNoiseTexture();
  }

  public async ensureChunk(
    cx: number,
    cz: number,
    priority: number = 0,
  ): Promise<void> {
    const key = `${cx},${cz}`;

    if (this.meshManager.getAllMeshes().has(key)) return;
    if (this.generationQueue.isPending(cx, cz)) return;

    if (this.dataManager.hasChunkData(key)) {
      const data = this.dataManager.getChunkData(key)!;
      this.buildChunkMesh(cx, cz, data);
      return;
    }

    this.generationQueue.enqueue(cx, cz, priority);
  }

  public processGenerationQueue(): void {
    this.generationQueue.process((cx, cz, data) => {
      this.processGeneratedChunk(cx, cz, data);
    });

    this.rebuildCounter++;
    if (
      this.rebuildCounter >= this.REBUILD_INTERVAL &&
      this.pendingMeshRebuilds.size > 0
    ) {
      this.rebuildCounter = 0;
      this.processPendingRebuilds();
    }
  }

  private processPendingRebuilds(): void {
    for (const key of this.pendingMeshRebuilds) {
      const [cxStr, czStr] = key.split(",");
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);

      const data = this.dataManager.getChunkData(key);
      if (data) {
        this.rebuildChunkMeshInternal(cx, cz, data);
      }
    }
    this.pendingMeshRebuilds.clear();
  }

  public updateChunkSorting(playerPos: THREE.Vector3): void {
    this.meshManager.updateSorting(playerPos);
  }

  public unloadChunk(key: string): void {
    this.meshManager.unloadMesh(key);
  }

  public rebuildChunkMesh(cx: number, cz: number): void {
    const key = `${cx},${cz}`;
    const data = this.dataManager.getChunkData(key);
    this.rebuildChunkMeshInternal(cx, cz, data);
  }

  public getBlock(x: number, y: number, z: number): number {
    return this.dataManager.getBlock(x, y, z);
  }

  public setBlock(x: number, y: number, z: number, type: number): void {
    this.dataManager.setBlock(x, y, z, type);

    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    this.pendingMeshRebuilds.add(`${cx},${cz}`);

    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;

    if (localX === 0) this.pendingMeshRebuilds.add(`${cx - 1},${cz}`);
    if (localX === this.chunkSize - 1) this.pendingMeshRebuilds.add(`${cx + 1},${cz}`);
    if (localZ === 0) this.pendingMeshRebuilds.add(`${cx},${cz - 1}`);
    if (localZ === this.chunkSize - 1) this.pendingMeshRebuilds.add(`${cx},${cz + 1}`);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    return this.dataManager.hasBlock(x, y, z);
  }

  public getTopY(worldX: number, worldZ: number): number {
    return this.dataManager.getTopY(worldX, worldZ);
  }

  public getBiomeAt(worldX: number, worldZ: number): BiomeId {
    return this.generationQueue.getBiomeAt(worldX, worldZ);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    return this.dataManager.isChunkLoaded(x, z);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    const key = `${cx},${cz}`;
    if (this.dataManager.hasChunkData(key)) {
      return;
    }

    const savedData = await this.persistence.loadChunk(key);
    if (savedData) {
      this.dataManager.setChunkData(key, savedData, false);
      this.buildChunkMesh(cx, cz, savedData);
      return;
    }

    this.generationQueue.enqueue(cx, cz, 0);

    return new Promise((resolve) => {
      const check = () => {
        this.generationQueue.process((genCx, genCz, data) => {
          this.processGeneratedChunk(genCx, genCz, data);
        });

        if (this.dataManager.hasChunkData(key)) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  public async saveDirtyChunks(): Promise<void> {
    const dirtyChunks = this.dataManager.getDirtyChunks();
    const toSave = new Map<string, Uint8Array>();

    for (const key of dirtyChunks) {
      const data = this.dataManager.getChunkData(key);
      if (data) {
        toSave.set(key, data);
      }
    }

    await this.persistence.saveBatch(toSave);
    this.dataManager.clearDirtyChunks();
  }

  public async clearCurrentWorld(): Promise<void> {
    await this.persistence.clearWorld(this.worldId);
    this.clearInMemory();
  }

  public clearInMemory(): void {
    this.dataManager.clear();
    this.meshManager.clear();
    this.generationQueue.clear();
    this.pendingMeshRebuilds.clear();
    this.rebuildCounter = 0;
  }

  public async clear(): Promise<void> {
    await this.clearCurrentWorld();
  }

  public getChunks(): Map<string, ChunkMesh> {
    return this.meshManager.getAllMeshes();
  }

  public getChunksData(): Map<string, Uint8Array> {
    return this.dataManager.getAllChunksData();
  }

  public getDirtyChunks(): Set<string> {
    return this.dataManager.getDirtyChunks();
  }

  private processGeneratedChunk(cx: number, cz: number, data: Uint8Array): void {
    const key = `${cx},${cz}`;
    this.dataManager.setChunkData(key, data, true);
    this.buildChunkMesh(cx, cz, data);
  }

  private buildChunkMesh(cx: number, cz: number, data: Uint8Array): void {
    this.meshManager.buildMesh(
      cx,
      cz,
      data,
      this.getBlockIndex.bind(this),
      this.getBlock.bind(this),
      this.getBiomeAt.bind(this),
    );
  }

  private rebuildChunkMeshInternal(
    cx: number,
    cz: number,
    data: Uint8Array | undefined,
  ): void {
    this.meshManager.rebuildMesh(
      cx,
      cz,
      data,
      this.getBlockIndex.bind(this),
      this.getBlock.bind(this),
      this.getBiomeAt.bind(this),
    );
  }

  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
  }
}
