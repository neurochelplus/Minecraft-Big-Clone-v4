import { TerrainGenerator } from "../generation/TerrainGenerator";
import { StructureGenerator } from "../generation/StructureGenerator";
import { ChunkPersistence } from "./ChunkPersistence";
import { ChunkWorkerPool } from "../workers/ChunkWorkerPool";

export type ChunkQueueItem = {
  cx: number;
  cz: number;
  priority: number;
};

/**
 * Управление очередью генерации чанков
 * Использует Web Workers для генерации в отдельных потоках
 */
export class ChunkGenerationQueue {
  private queue: ChunkQueueItem[] = [];
  private pendingChunks: Set<string> = new Set();
  private generatingChunks: Set<string> = new Set();
  private maxConcurrent: number = 2; // Максимум параллельных генераций

  private terrainGen: TerrainGenerator;
  private structureGen: StructureGenerator;
  private persistence: ChunkPersistence;
  private chunkSize: number;
  private chunkHeight: number;
  
  // Web Worker pool
  private workerPool: ChunkWorkerPool | null = null;
  private useWorkers: boolean = true;

  constructor(
    terrainGen: TerrainGenerator,
    structureGen: StructureGenerator,
    persistence: ChunkPersistence,
    chunkSize: number,
    chunkHeight: number,
  ) {
    this.terrainGen = terrainGen;
    this.structureGen = structureGen;
    this.persistence = persistence;
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
    
    // Инициализировать Worker pool
    this.initWorkerPool();
  }

  private initWorkerPool(): void {
    try {
      this.workerPool = new ChunkWorkerPool(
        this.terrainGen.getSeed(),
        this.chunkSize,
        this.chunkHeight,
        2, // 2 воркера
      );
    } catch (e) {
      console.warn('Web Workers not supported, falling back to main thread');
      this.useWorkers = false;
    }
  }

  /**
   * Обновить seed в worker pool
   */
  public setSeed(seed: number): void {
    this.workerPool?.setSeed(seed);
  }

  /**
   * Добавить чанк в очередь генерации
   */
  public enqueue(cx: number, cz: number, priority: number): void {
    const key = `${cx},${cz}`;
    
    if (this.pendingChunks.has(key) || this.generatingChunks.has(key)) return;

    this.pendingChunks.add(key);
    this.queue.push({ cx, cz, priority });
    
    // Сортировать по приоритету (ближние чанки первыми)
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Проверить, находится ли чанк в очереди или генерируется
   */
  public isPending(cx: number, cz: number): boolean {
    const key = `${cx},${cz}`;
    return this.pendingChunks.has(key) || this.generatingChunks.has(key);
  }

  /**
   * Обработать очередь (запустить генерацию через Workers)
   */
  public process(
    onChunkGenerated: (cx: number, cz: number, data: Uint8Array) => void,
  ): void {
    // Запустить генерацию для чанков в очереди
    while (
      this.queue.length > 0 && 
      this.generatingChunks.size < this.maxConcurrent
    ) {
      const item = this.queue.shift()!;
      const key = `${item.cx},${item.cz}`;
      
      this.pendingChunks.delete(key);
      this.generatingChunks.add(key);

      // Проверить persistence
      if (this.persistence.hasChunk(key)) {
        this.loadFromPersistence(item.cx, item.cz, key, onChunkGenerated);
      } else if (this.useWorkers && this.workerPool) {
        // Генерация через Worker
        this.generateWithWorker(item.cx, item.cz, key, item.priority, onChunkGenerated);
      } else {
        // Fallback: генерация в main thread
        const data = this.generateChunkSync(item.cx, item.cz);
        this.generatingChunks.delete(key);
        onChunkGenerated(item.cx, item.cz, data);
      }
    }
  }

  /**
   * Генерация через Web Worker (async)
   */
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
    } catch (e) {
      console.error('Worker generation failed:', e);
      this.generatingChunks.delete(key);
      // Fallback to sync generation
      const data = this.generateChunkSync(cx, cz);
      onChunkGenerated(cx, cz, data);
    }
  }

  /**
   * Загрузить чанк из IndexedDB
   */
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
      this.generatingChunks.delete(key);
      
      if (data) {
        onChunkGenerated(cx, cz, data);
      } else {
        // Данных нет - генерируем
        if (this.useWorkers && this.workerPool) {
          const generated = await this.workerPool.generateChunk(cx, cz, 0);
          onChunkGenerated(cx, cz, generated);
        } else {
          const generated = this.generateChunkSync(cx, cz);
          onChunkGenerated(cx, cz, generated);
        }
      }
    } catch (e) {
      console.error('Persistence load failed:', e);
      this.generatingChunks.delete(key);
    }
  }

  /**
   * Синхронная генерация чанка (fallback)
   */
  private generateChunkSync(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(this.chunkSize * this.chunkSize * this.chunkHeight);
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    const getBlockIndex = (x: number, y: number, z: number): number => {
      return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
    };

    // Generate terrain
    this.terrainGen.generateTerrain(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      getBlockIndex,
    );

    // Generate ores
    this.structureGen.generateOres(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      getBlockIndex,
    );

    // Generate trees
    this.structureGen.generateTrees(
      data,
      this.chunkSize,
      this.chunkHeight,
      getBlockIndex,
    );

    return data;
  }

  /**
   * Очистить очередь
   */
  public clear(): void {
    this.queue = [];
    this.pendingChunks.clear();
    this.generatingChunks.clear();
    this.workerPool?.clearQueue();
  }

  /**
   * Завершить работу (cleanup)
   */
  public terminate(): void {
    this.clear();
    this.workerPool?.terminate();
    this.workerPool = null;
  }
}
