import { beforeEach, describe, expect, it, vi } from "vitest";

const { chunksStore, worldDBMock } = vi.hoisted(() => {
  const store = new Map<string, Uint8Array>();
  return {
    chunksStore: store,
    worldDBMock: {
      init: vi.fn(async () => {}),
      keysByPrefix: vi.fn(async (_store: string, prefix: string) => {
        return Array.from(store.keys()).filter((key) => key.startsWith(prefix));
      }),
      get: vi.fn(async (key: string) => store.get(key)),
      set: vi.fn(async (key: string, value: Uint8Array) => {
        store.set(key, value);
      }),
      deleteMany: vi.fn(async (_store: string, keys: string[]) => {
        keys.forEach((key) => store.delete(key));
      }),
    },
  };
});

vi.mock("../../utils/DB", () => ({
  worldDB: worldDBMock,
}));

import { ChunkPersistence } from "./ChunkPersistence";

describe("ChunkPersistence world isolation", () => {
  beforeEach(() => {
    chunksStore.clear();
    vi.clearAllMocks();
  });

  it("loads only chunks from the active world prefix", async () => {
    chunksStore.set("w:world-a:c:0,0", new Uint8Array([1]));
    chunksStore.set("w:world-b:c:0,0", new Uint8Array([2]));

    const persistence = new ChunkPersistence();
    persistence.setWorldId("world-a");
    await persistence.init();

    const chunkA = await persistence.loadChunk("0,0");
    expect(Array.from(chunkA ?? [])).toEqual([1]);
  });

  it("keeps same chunk coords isolated across worlds", async () => {
    const persistence = new ChunkPersistence();

    persistence.setWorldId("world-a");
    await persistence.init();
    await persistence.saveChunk("3,7", new Uint8Array([10]));

    persistence.setWorldId("world-b");
    await persistence.init();
    await persistence.saveChunk("3,7", new Uint8Array([20]));

    persistence.setWorldId("world-a");
    await persistence.init();
    const worldAChunk = await persistence.loadChunk("3,7");

    persistence.setWorldId("world-b");
    await persistence.init();
    const worldBChunk = await persistence.loadChunk("3,7");

    expect(Array.from(worldAChunk ?? [])).toEqual([10]);
    expect(Array.from(worldBChunk ?? [])).toEqual([20]);
  });

  it("clearWorld removes only chunks with selected world prefix", async () => {
    chunksStore.set("w:world-a:c:1,1", new Uint8Array([1]));
    chunksStore.set("w:world-a:c:2,2", new Uint8Array([2]));
    chunksStore.set("w:world-b:c:1,1", new Uint8Array([3]));

    const persistence = new ChunkPersistence();
    persistence.setWorldId("world-a");
    await persistence.clearWorld();

    expect(chunksStore.has("w:world-a:c:1,1")).toBe(false);
    expect(chunksStore.has("w:world-a:c:2,2")).toBe(false);
    expect(chunksStore.has("w:world-b:c:1,1")).toBe(true);
  });
});
