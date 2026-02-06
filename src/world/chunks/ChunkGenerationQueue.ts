import { ChunkPersistence } from "./ChunkPersistence";
import { ChunkWorkerPool } from "../workers/ChunkWorkerPool";
import type { BiomeId } from "../generation/runtime/BiomeRegistry";
import {
  generateChunkData,
  getBiomeIdAt,
  getTerrainHeightAt,
} from "../generation/runtime/GenerateChunk";
import {
  WORLD_GEN_PRESET_LEGACY,
  normalizeWorldGenPresetId,
  type WorldGenPresetId,
} from "../generation/WorldGenPresets";

export type ChunkQueueItem = {
  cx: number;
  cz: number;
  priority: number;
};

/**
 * Manages asynchronous chunk generation queue (worker + sync fallback).
 */
export class ChunkGenerationQueue {
  private queue: ChunkQueueItem[] = [];
  private pendingChunks: Set<string> = new Set();
  private generatingChunks: Set<string> = new Set();
  private maxConcurrent: number = 2;

  private persistence: ChunkPersistence;
  private chunkSize: number;
  private chunkHeight: number;
  private seed: number;
  private presetId: WorldGenPresetId;

  private workerPool: ChunkWorkerPool | null = null;
  private useWorkers: boolean = true;

  constructor(
    persistence: ChunkPersistence,
    chunkSize: number,
    chunkHeight: number,
    seed: number,
    presetId: WorldGenPresetId = WORLD_GEN_PRESET_LEGACY,
  ) {
    this.persistence = persistence;
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
    this.seed = seed;
    this.presetId = presetId;
    this.initWorkerPool();
  }

  private initWorkerPool(): void {
    try {
      this.workerPool = new ChunkWorkerPool(
        this.seed,
        this.presetId,
        this.chunkSize,
        this.chunkHeight,
        2,
      );
    } catch {
      console.warn("Web Workers unavailable, using main thread generation.");
      this.useWorkers = false;
      this.workerPool = null;
    }
  }

  public setGenerationContext(seed: number, presetId: string): void {
    this.seed = seed;
    this.presetId = normalizeWorldGenPresetId(presetId);
    this.workerPool?.setContext(this.seed, this.presetId);
  }

  public setSeed(seed: number): void {
    this.setGenerationContext(seed, this.presetId);
  }

  public getTerrainHeight(worldX: number, worldZ: number): number {
    return getTerrainHeightAt(this.seed, this.presetId, worldX, worldZ);
  }

  public getBiomeAt(worldX: number, worldZ: number): BiomeId {
    return getBiomeIdAt(this.seed, this.presetId, worldX, worldZ);
  }

  public enqueue(cx: number, cz: number, priority: number): void {
    const key = `${cx},${cz}`;
    if (this.pendingChunks.has(key) || this.generatingChunks.has(key)) {
      return;
    }

    this.pendingChunks.add(key);
    this.queue.push({ cx, cz, priority });
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  public isPending(cx: number, cz: number): boolean {
    const key = `${cx},${cz}`;
    return this.pendingChunks.has(key) || this.generatingChunks.has(key);
  }

  public process(
    onChunkGenerated: (cx: number, cz: number, data: Uint8Array) => void,
  ): void {
    while (
      this.queue.length > 0 &&
      this.generatingChunks.size < this.maxConcurrent
    ) {
      const item = this.queue.shift()!;
      const key = `${item.cx},${item.cz}`;
      this.pendingChunks.delete(key);
      this.generatingChunks.add(key);

      if (this.persistence.hasChunk(key)) {
        void this.loadFromPersistence(item.cx, item.cz, key, onChunkGenerated);
      } else if (this.useWorkers && this.workerPool) {
        void this.generateWithWorker(
          item.cx,
          item.cz,
          key,
          item.priority,
          onChunkGenerated,
        );
      } else {
        const data = this.generateChunkSync(item.cx, item.cz);
        this.generatingChunks.delete(key);
        onChunkGenerated(item.cx, item.cz, data);
      }
    }
  }

  private async generateWithWorker(
    cx: number,
    cz: number,
    key: string,
    priority: number,
    onChunkGenerated: (cx: number, cz: number, data: Uint8Array) => void,
  ): Promise<void> {
    try {
      const data = await this.workerPool!.generateChunk(cx, cz, priority);
      this.generatingChunks.delete(key);
      onChunkGenerated(cx, cz, data);
    } catch (error) {
      console.error("Worker generation failed:", error);
      const data = this.generateChunkSync(cx, cz);
      this.generatingChunks.delete(key);
      onChunkGenerated(cx, cz, data);
    }
  }

  private async loadFromPersistence(
    cx: number,
    cz: number,
    key: string,
    onChunkGenerated: (cx: number, cz: number, data: Uint8Array) => void,
  ): Promise<void> {
    if (this.persistence.isLoading(key)) {
      this.generatingChunks.delete(key);
      return;
    }

    try {
      const data = await this.persistence.loadChunk(key);
      if (data) {
        this.generatingChunks.delete(key);
        onChunkGenerated(cx, cz, data);
        return;
      }

      if (this.useWorkers && this.workerPool) {
        const generated = await this.workerPool.generateChunk(cx, cz, 0);
        this.generatingChunks.delete(key);
        onChunkGenerated(cx, cz, generated);
        return;
      }

      const generated = this.generateChunkSync(cx, cz);
      this.generatingChunks.delete(key);
      onChunkGenerated(cx, cz, generated);
    } catch (error) {
      console.error("Failed to load chunk from persistence:", error);
      const generated = this.generateChunkSync(cx, cz);
      onChunkGenerated(cx, cz, generated);
      this.generatingChunks.delete(key);
    }
  }

  private generateChunkSync(cx: number, cz: number): Uint8Array {
    return generateChunkData({
      seed: this.seed,
      presetId: this.presetId,
      chunkSize: this.chunkSize,
      chunkHeight: this.chunkHeight,
      cx,
      cz,
    });
  }

  public clear(): void {
    this.queue = [];
    this.pendingChunks.clear();
    this.generatingChunks.clear();
    this.workerPool?.clearQueue();
  }

  public terminate(): void {
    this.clear();
    this.workerPool?.terminate();
    this.workerPool = null;
  }
}
