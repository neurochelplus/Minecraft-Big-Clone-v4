/**
 * Пул Web Workers для параллельной генерации чанков
 * Распределяет задачи между воркерами и управляет очередью
 */

export interface ChunkTask {
  id: number;
  cx: number;
  cz: number;
  priority: number;
  resolve: (data: Uint8Array) => void;
  reject: (error: Error) => void;
}

export class ChunkWorkerPool {
  private workers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private taskQueue: ChunkTask[] = [];
  private taskIdCounter: number = 0;
  private pendingTasks: Map<number, ChunkTask> = new Map();
  
  private seed: number;
  private chunkSize: number;
  private chunkHeight: number;
  private poolSize: number;
  private readyWorkers: number = 0;

  constructor(
    seed: number,
    chunkSize: number,
    chunkHeight: number,
    poolSize: number = navigator.hardwareConcurrency || 4,
  ) {
    this.seed = seed;
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
    this.poolSize = Math.min(poolSize, 4); // Максимум 4 воркера
    
    this.initWorkers();
  }

  private initWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(
        new URL('./terrain.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      worker.onmessage = (e) => this.handleMessage(worker, e);
      worker.onerror = (e) => this.handleError(worker, e);
      
      this.workers.push(worker);
    }
  }

  private handleMessage(worker: Worker, e: MessageEvent): void {
    const { type, id, data } = e.data;
    
    if (type === 'ready') {
      this.readyWorkers++;
      return;
    }
    
    if (type === 'result') {
      const task = this.pendingTasks.get(id);
      if (task) {
        task.resolve(data);
        this.pendingTasks.delete(id);
      }
      
      this.busyWorkers.delete(worker);
      this.processQueue();
    }
  }

  private handleError(worker: Worker, e: ErrorEvent): void {
    console.error('Worker error:', e.message);
    
    // Найти и отклонить задачу этого воркера
    for (const [id, task] of this.pendingTasks) {
      task.reject(new Error(`Worker error: ${e.message}`));
      this.pendingTasks.delete(id);
    }
    
    this.busyWorkers.delete(worker);
    this.processQueue();
  }

  /**
   * Добавить задачу генерации чанка
   */
  public generateChunk(cx: number, cz: number, priority: number = 0): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const task: ChunkTask = {
        id: this.taskIdCounter++,
        cx,
        cz,
        priority,
        resolve,
        reject,
      };
      
      this.taskQueue.push(task);
      this.taskQueue.sort((a, b) => a.priority - b.priority);
      
      this.processQueue();
    });
  }

  /**
   * Обработать очередь задач
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const availableWorker = this.getAvailableWorker();
      if (!availableWorker) break;
      
      const task = this.taskQueue.shift()!;
      this.executeTask(availableWorker, task);
    }
  }

  private getAvailableWorker(): Worker | null {
    for (const worker of this.workers) {
      if (!this.busyWorkers.has(worker)) {
        return worker;
      }
    }
    return null;
  }

  private executeTask(worker: Worker, task: ChunkTask): void {
    this.busyWorkers.add(worker);
    this.pendingTasks.set(task.id, task);
    
    worker.postMessage({
      type: 'generate',
      id: task.id,
      cx: task.cx,
      cz: task.cz,
      seed: this.seed,
      chunkSize: this.chunkSize,
      chunkHeight: this.chunkHeight,
    });
  }

  /**
   * Обновить seed для всех воркеров
   */
  public setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Проверить готовность пула
   */
  public isReady(): boolean {
    return this.readyWorkers >= this.poolSize;
  }

  /**
   * Получить количество задач в очереди
   */
  public getQueueSize(): number {
    return this.taskQueue.length;
  }

  /**
   * Получить количество занятых воркеров
   */
  public getBusyCount(): number {
    return this.busyWorkers.size;
  }

  /**
   * Очистить очередь
   */
  public clearQueue(): void {
    for (const task of this.taskQueue) {
      task.reject(new Error('Queue cleared'));
    }
    this.taskQueue = [];
  }

  /**
   * Завершить все воркеры
   */
  public terminate(): void {
    this.clearQueue();
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.busyWorkers.clear();
    this.pendingTasks.clear();
  }
}
