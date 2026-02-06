import * as THREE from "three";
import { TerrainGenerator } from "../generation/TerrainGenerator";
import { StructureGenerator } from "../generation/StructureGenerator";
import { ChunkPersistence } from "./ChunkPersistence";
import { ChunkGenerationQueue } from "./ChunkGenerationQueue";
import { ChunkDataManager } from "./ChunkDataManager";
import { ChunkMeshManager } from "./ChunkMeshManager";
import type { ChunkMesh } from "./ChunkMeshManager";

export class ChunkLoader {
  private chunkSize: number;
  private chunkHeight: number;

  private terrainGen: TerrainGenerator;
  private structureGen: StructureGenerator;
  private persistence: ChunkPersistence;

  private generationQueue: ChunkGenerationQueue;
  private dataManager: ChunkDataManager;
  private meshManager: ChunkMeshManager;

  private pendingMeshRebuilds: Set<string> = new Set();
  private rebuildCounter: number = 0;
  private readonly REBUILD_INTERVAL: number = 2;
  private worldId: string = "default";

  constructor(
    scene: THREE.Scene,
    chunkSize: number,
    chunkHeight: number,
    seed?: number,
  ) {
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;

    this.terrainGen = new TerrainGenerator(seed);
    this.structureGen = new StructureGenerator(this.terrainGen);
    this.persistence = new ChunkPersistence();

    this.generationQueue = new ChunkGenerationQueue(
      this.terrainGen,
      this.structureGen,
      this.persistence,
      chunkSize,
      chunkHeight,
    );

    this.dataManager = new ChunkDataManager(
      chunkSize,
      chunkHeight,
      this.terrainGen,
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

  public async switchWorld(worldId: string, seed: number): Promise<void> {
    this.worldId = worldId;
    this.persistence.setWorldId(worldId);
    this.clearInMemory();
    this.setSeed(seed);
    await this.persistence.init();
  }

  public getSeed(): number {
    return this.terrainGen.getSeed();
  }

  public setSeed(seed: number): void {
    this.terrainGen.setSeed(seed);
    this.generationQueue.setSeed(seed);
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
      this.meshManager.buildMesh(
        cx,
        cz,
        data,
        this.getBlockIndex.bind(this),
        this.getBlock.bind(this),
      );
      return;
    }

    this.generationQueue.enqueue(cx, cz, priority);
  }

  public processGenerationQueue(): void {
    this.generationQueue.process((cx, cz, data) => {
      const key = `${cx},${cz}`;
      this.dataManager.setChunkData(key, data, true);
      this.meshManager.buildMesh(
        cx,
        cz,
        data,
        this.getBlockIndex.bind(this),
        this.getBlock.bind(this),
      );
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
        this.meshManager.rebuildMesh(
          cx,
          cz,
          data,
          this.getBlockIndex.bind(this),
          this.getBlock.bind(this),
        );
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
    this.meshManager.rebuildMesh(
      cx,
      cz,
      data,
      this.getBlockIndex.bind(this),
      this.getBlock.bind(this),
    );
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
    if (localX === this.chunkSize - 1)
      this.pendingMeshRebuilds.add(`${cx + 1},${cz}`);
    if (localZ === 0) this.pendingMeshRebuilds.add(`${cx},${cz - 1}`);
    if (localZ === this.chunkSize - 1)
      this.pendingMeshRebuilds.add(`${cx},${cz + 1}`);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    return this.dataManager.hasBlock(x, y, z);
  }

  public getTopY(worldX: number, worldZ: number): number {
    return this.dataManager.getTopY(worldX, worldZ);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    return this.dataManager.isChunkLoaded(x, z);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    const key = `${cx},${cz}`;
    if (this.dataManager.hasChunkData(key)) return;

    const savedData = await this.persistence.loadChunk(key);
    if (savedData) {
      this.dataManager.setChunkData(key, savedData, false);
      this.meshManager.buildMesh(
        cx,
        cz,
        savedData,
        this.getBlockIndex.bind(this),
        this.getBlock.bind(this),
      );
      return;
    }

    this.generationQueue.enqueue(cx, cz, 0);

    return new Promise((resolve) => {
      const check = () => {
        this.generationQueue.process((genCx, genCz, data) => {
          const genKey = `${genCx},${genCz}`;
          this.dataManager.setChunkData(genKey, data, true);
          this.meshManager.buildMesh(
            genCx,
            genCz,
            data,
            this.getBlockIndex.bind(this),
            this.getBlock.bind(this),
          );
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

  // Backward-compatible alias
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

  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
  }
}
