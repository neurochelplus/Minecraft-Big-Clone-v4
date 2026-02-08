import * as THREE from "three";
import { ChunkLoader } from "./ChunkLoader";
import { ChunkVisibility } from "./ChunkVisibility";
import { logger } from "../../utils/Logger";
import type { BiomeId } from "../generation/runtime/BiomeRegistry";
import { WORLD_GEN_PRESET_LEGACY, type WorldGenPresetId } from "../generation/WorldGenPresets";

declare global {
  interface Window {
    __profiler?: {
      startMeasure(label: string): void;
      endMeasure(label: string): void;
    };
  }
}

export class ChunkManager {
  private chunkSize: number = 32;
  private chunkHeight: number = 128;

  private loader: ChunkLoader;
  private visibility: ChunkVisibility;

  private updateCounter: number = 0;
  private readonly UPDATE_INTERVAL: number = 3;

  private lastPlayerChunkX: number = -Infinity;
  private lastPlayerChunkZ: number = -Infinity;

  constructor(scene: THREE.Scene, seed?: number) {
    this.loader = new ChunkLoader(
      scene,
      this.chunkSize,
      this.chunkHeight,
      seed,
      WORLD_GEN_PRESET_LEGACY,
    );
    this.visibility = new ChunkVisibility(this.chunkSize, this.chunkHeight);
  }

  private resetRuntimeState(): void {
    this.updateCounter = 0;
    this.lastPlayerChunkX = -Infinity;
    this.lastPlayerChunkZ = -Infinity;
  }

  public async init(): Promise<void> {
    await this.loader.init();
  }

  public getSeed(): number {
    return this.loader.getSeed();
  }

  public setSeed(seed: number): void {
    this.loader.setSeed(seed);
  }

  public setGenerationContext(seed: number, presetId: WorldGenPresetId): void {
    this.loader.setGenerationContext(seed, presetId);
  }

  public getWorldId(): string {
    return this.loader.getWorldId();
  }

  public async switchWorld(
    worldId: string,
    seed: number,
    presetId: WorldGenPresetId,
  ): Promise<void> {
    await this.loader.switchWorld(worldId, seed, presetId);
    this.visibility.clearAll();
    this.resetRuntimeState();
  }

  public async clearCurrentWorld(): Promise<void> {
    await this.loader.clearCurrentWorld();
    this.visibility.clearAll();
    this.resetRuntimeState();
  }

  public clearInMemory(): void {
    this.loader.clearInMemory();
    this.visibility.clearAll();
    this.resetRuntimeState();
  }

  public getNoiseTexture(): THREE.DataTexture {
    return this.loader.getNoiseTexture();
  }

  public update(playerPos: THREE.Vector3): void {
    const profiler = window.__profiler;

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    const playerMovedChunk =
      cx !== this.lastPlayerChunkX || cz !== this.lastPlayerChunkZ;
    this.updateCounter++;

    const shouldFullUpdate =
      playerMovedChunk || this.updateCounter >= this.UPDATE_INTERVAL;

    if (shouldFullUpdate) {
      this.updateCounter = 0;
      this.lastPlayerChunkX = cx;
      this.lastPlayerChunkZ = cz;
    }

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    const radius = isMobile ? 2 : 3;

    const activeChunks = new Set<string>();

    profiler?.startMeasure("chunk-queue");
    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let z = cz - radius; z <= cz + radius; z++) {
        const key = `${x},${z}`;
        activeChunks.add(key);

        if (!this.loader.getChunks().has(key)) {
          const priority = Math.abs(x - cx) + Math.abs(z - cz);
          void this.loader.ensureChunk(x, z, priority);
        }
      }
    }
    profiler?.endMeasure("chunk-queue");

    profiler?.startMeasure("chunk-generation");
    this.loader.processGenerationQueue();
    profiler?.endMeasure("chunk-generation");

    if (shouldFullUpdate) {
      profiler?.startMeasure("chunk-unload");
      for (const [key] of this.loader.getChunks()) {
        if (!activeChunks.has(key)) {
          this.loader.unloadChunk(key);
          this.visibility.clearBounds(key);
        }
      }
      profiler?.endMeasure("chunk-unload");

      profiler?.startMeasure("chunk-sorting");
      this.loader.updateChunkSorting(playerPos);
      profiler?.endMeasure("chunk-sorting");
    }

    if (Math.random() < (isMobile ? 0.02 : 0.005)) {
      this.checkMemory(playerPos);
    }
  }

  public updateVisibility(camera: THREE.Camera): void {
    this.visibility.update(camera, this.loader.getChunks());
  }

  private checkMemory(playerPos: THREE.Vector3): void {
    const chunksData = this.loader.getChunksData();
    if (chunksData.size <= 500) return;

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    const entries = Array.from(chunksData.entries());
    entries.sort((a, b) => {
      const [ax, az] = a[0].split(",").map(Number);
      const [bx, bz] = b[0].split(",").map(Number);
      const distA = (ax - cx) ** 2 + (az - cz) ** 2;
      const distB = (bx - cx) ** 2 + (bz - cz) ** 2;
      return distB - distA;
    });

    const dirtyChunks = this.loader.getDirtyChunks();

    for (let i = 0; i < 50 && i < entries.length; i++) {
      const [key] = entries[i];

      if (dirtyChunks.has(key)) {
        continue;
      }

      chunksData.delete(key);
      this.loader.unloadChunk(key);
    }
    logger.debug("Memory cleanup performed.");
  }

  public getBlock(x: number, y: number, z: number): number {
    return this.loader.getBlock(x, y, z);
  }

  public setBlock(x: number, y: number, z: number, type: number): void {
    this.loader.setBlock(x, y, z, type);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    return this.loader.hasBlock(x, y, z);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    return this.loader.isChunkLoaded(x, z);
  }

  public getTopY(worldX: number, worldZ: number): number {
    return this.loader.getTopY(worldX, worldZ);
  }

  public getBiomeAt(worldX: number, worldZ: number): BiomeId {
    return this.loader.getBiomeAt(worldX, worldZ);
  }

  public async loadChunk(cx: number, cz: number): Promise<void> {
    await this.loader.ensureChunk(cx, cz);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    await this.loader.waitForChunk(cx, cz);
  }

  public async saveDirtyChunks(): Promise<void> {
    await this.loader.saveDirtyChunks();
  }

  public getChunkCount(): { visible: number; total: number } {
    const chunks = this.loader.getChunks();
    let visible = 0;

    for (const [, chunk] of chunks) {
      if (chunk.mesh.visible) visible++;
    }

    return { visible, total: chunks.size };
  }

  // Backward-compatible alias
  public async clear(): Promise<void> {
    await this.clearCurrentWorld();
  }
}
