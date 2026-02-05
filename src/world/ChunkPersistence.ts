import { worldDB } from "../utils/DB";
import type { IStorage } from "../contracts/storage";
import type { ChunkMeta } from "../contracts/chunks";

type StoredChunk = {
  v: number;
  data: Uint8Array;
  meta: ChunkMeta;
};

export class ChunkPersistence {
  private storage: IStorage = worldDB;
  private knownChunkKeys: Set<string> = new Set();
  private loadingChunks: Set<string> = new Set();

  public async init(): Promise<void> {
    await this.storage.init();
    const keys = await this.storage.keys("chunks");
    keys.forEach((k) => this.knownChunkKeys.add(k as string));
    console.log(`Loaded world index. ${this.knownChunkKeys.size} chunks in DB.`);
  }

  public async loadChunk(key: string): Promise<StoredChunk | null> {
    if (!this.knownChunkKeys.has(key)) {
      return null;
    }

    if (this.loadingChunks.has(key)) {
      // Already loading, wait for it
      return new Promise<StoredChunk | null>((resolve) => {
        const start = Date.now();
        const timeoutMs = 5000;
        const check = () => {
          if (!this.loadingChunks.has(key)) {
            this.storage
              .get<StoredChunk | Uint8Array | null>(key, "chunks")
              .then((data) => resolve(this.normalizeStoredChunk(data)));
          } else if (Date.now() - start > timeoutMs) {
            console.warn("Chunk load wait timed out:", key);
            this.storage
              .get<StoredChunk | Uint8Array | null>(key, "chunks")
              .then((data) => resolve(this.normalizeStoredChunk(data)));
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    }

    this.loadingChunks.add(key);
    try {
      const data = await this.storage.get<StoredChunk | Uint8Array | null>(
        key,
        "chunks",
      );
      return this.normalizeStoredChunk(data);
    } finally {
      this.loadingChunks.delete(key);
    }
  }

  public async saveChunk(key: string, data: StoredChunk): Promise<void> {
    await this.storage.set(key, data, "chunks");
    this.knownChunkKeys.add(key);
  }

  public async saveBatch(chunks: Map<string, StoredChunk>): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [key, data] of chunks) {
      promises.push(this.saveChunk(key, data));
    }
    await Promise.all(promises);
  }

  public async clear(): Promise<void> {
    await this.storage.clear();
    this.knownChunkKeys.clear();
    this.loadingChunks.clear();
  }

  public hasChunk(key: string): boolean {
    return this.knownChunkKeys.has(key);
  }

  public isLoading(key: string): boolean {
    return this.loadingChunks.has(key);
  }

  private normalizeStoredChunk(
    value: StoredChunk | Uint8Array | null | undefined,
  ): StoredChunk | null {
    if (!value) return null;
    if (value instanceof Uint8Array) {
      return {
        v: 0,
        data: value,
        meta: { version: 1, seed: 0, biomeId: 0 },
      };
    }
    return value;
  }
}
