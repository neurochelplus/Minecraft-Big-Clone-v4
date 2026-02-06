import { worldDB } from "../../utils/DB";
import { logger } from "../../utils/Logger";

export class ChunkPersistence {
  private worldId: string = "default";
  private knownChunkKeys: Set<string> = new Set();
  private loadingChunks: Set<string> = new Set();

  public setWorldId(worldId: string): void {
    if (this.worldId === worldId) {
      return;
    }
    this.worldId = worldId;
    this.knownChunkKeys.clear();
    this.loadingChunks.clear();
  }

  private getChunkPrefix(worldId: string = this.worldId): string {
    return `w:${worldId}:c:`;
  }

  private toStorageKey(key: string): string {
    return `${this.getChunkPrefix()}${key}`;
  }

  private fromStorageKey(storageKey: string): string {
    return storageKey.slice(this.getChunkPrefix().length);
  }

  public async init(): Promise<void> {
    await worldDB.init();
    this.knownChunkKeys.clear();
    this.loadingChunks.clear();

    const keys = await worldDB.keysByPrefix("chunks", this.getChunkPrefix());
    keys.forEach((storageKey) =>
      this.knownChunkKeys.add(this.fromStorageKey(storageKey)),
    );

    logger.debug(
      `Loaded world index for ${this.worldId}. ${this.knownChunkKeys.size} chunks in DB.`,
    );
  }

  public async loadChunk(key: string): Promise<Uint8Array | null> {
    if (!this.knownChunkKeys.has(key)) {
      return null;
    }

    if (this.loadingChunks.has(key)) {
      // Already loading, wait for it
      return new Promise((resolve) => {
        const check = () => {
          if (!this.loadingChunks.has(key)) {
            worldDB.get(this.toStorageKey(key), "chunks").then((data) => {
              resolve((data as Uint8Array | undefined) ?? null);
            });
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    }

    this.loadingChunks.add(key);
    try {
      const data = await worldDB.get(this.toStorageKey(key), "chunks");
      return data as Uint8Array | null;
    } finally {
      this.loadingChunks.delete(key);
    }
  }

  public async saveChunk(key: string, data: Uint8Array): Promise<void> {
    await worldDB.set(this.toStorageKey(key), data, "chunks");
    this.knownChunkKeys.add(key);
  }

  public async saveBatch(chunks: Map<string, Uint8Array>): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [key, data] of chunks) {
      promises.push(this.saveChunk(key, data));
    }
    await Promise.all(promises);
  }

  public async clearWorld(worldId: string = this.worldId): Promise<void> {
    await worldDB.init();
    const storageKeys = await worldDB.keysByPrefix("chunks", this.getChunkPrefix(worldId));
    await worldDB.deleteMany("chunks", storageKeys);

    this.knownChunkKeys.clear();
    this.loadingChunks.clear();
  }

  public hasChunk(key: string): boolean {
    return this.knownChunkKeys.has(key);
  }

  public isLoading(key: string): boolean {
    return this.loadingChunks.has(key);
  }
}
