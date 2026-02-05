import type { ChunkData, ChunkMeshData } from "../../contracts/chunks";

type GenerateRequest = {
  id: number;
  type: "generate";
  cx: number;
  cz: number;
  seed: number;
  chunkSize: number;
  chunkHeight: number;
  withMesh: boolean;
};

type GenerateResponse = {
  id: number;
  type: "generateResult";
  chunk: ChunkData;
  meshData?: ChunkMeshData;
};

type Pending = {
  resolve: (value: { chunk: ChunkData; meshData?: ChunkMeshData }) => void;
  reject: (err: unknown) => void;
  workerIndex: number;
};

export class ChunkWorkerPool {
  private workers: Worker[] = [];
  private nextWorker = 0;
  private nextId = 1;
  private pending: Map<number, Pending> = new Map();
  private pendingByWorker: Map<number, Set<number>> = new Map();

  constructor(count: number) {
    for (let i = 0; i < count; i++) {
      this.pendingByWorker.set(i, new Set());
      this.workers.push(this.createWorker(i));
    }
  }

  private createWorker(index: number): Worker {
    const worker = new Worker(new URL("./chunkWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<GenerateResponse>) => {
      const message = event.data;
      if (message.type !== "generateResult") return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      this.pendingByWorker.get(pending.workerIndex)?.delete(message.id);
      pending.resolve({ chunk: message.chunk, meshData: message.meshData });
    };
    worker.onerror = (err) => {
      console.error("Chunk worker error:", err);
      const ids = this.pendingByWorker.get(index);
      if (ids) {
        for (const id of ids) {
          const pending = this.pending.get(id);
          if (pending) {
            pending.reject(err);
            this.pending.delete(id);
          }
        }
        ids.clear();
      }
      this.replaceWorker(index);
    };
    return worker;
  }

  private replaceWorker(index: number): void {
    const worker = this.workers[index];
    if (worker) {
      worker.terminate();
    }
    this.workers[index] = this.createWorker(index);
  }

  public async generateChunk(
    cx: number,
    cz: number,
    seed: number,
    chunkSize: number,
    chunkHeight: number,
    withMesh: boolean,
  ): Promise<{ chunk: ChunkData; meshData?: ChunkMeshData }> {
    const id = this.nextId++;
    const workerIndex = this.nextWorker;
    const worker = this.workers[workerIndex];
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;

    const req: GenerateRequest = {
      id,
      type: "generate",
      cx,
      cz,
      seed,
      chunkSize,
      chunkHeight,
      withMesh,
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, workerIndex });
      this.pendingByWorker.get(workerIndex)?.add(id);
      worker.postMessage(req);
    });
  }

  public dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.pending.clear();
    this.pendingByWorker.clear();
  }
}
