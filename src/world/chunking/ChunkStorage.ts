import * as THREE from "three";
import { BLOCK } from "../../constants/Blocks";
import type { ChunkMeta } from "../../contracts/chunks";
import type { ChunkManagerState } from "./types";
import { getBlockIndex, getNeighborBlock } from "./ChunkAccess";
import { disposeChunkMeshResources, queueRebuild } from "./ChunkMeshing";
import { ensureChunk } from "./ChunkGeneration";

export async function checkMemory(
  state: ChunkManagerState,
  playerPos: THREE.Vector3,
): Promise<void> {
  if (state.chunksData.size <= 500) return;

  const cx = Math.floor(playerPos.x / state.chunkSize);
  const cz = Math.floor(playerPos.z / state.chunkSize);

  const entries = Array.from(state.chunksData.entries());
  entries.sort((a, b) => {
    const [ax, az] = a[0].split(",").map(Number);
    const [bx, bz] = b[0].split(",").map(Number);
    const distA = (ax - cx) ** 2 + (az - cz) ** 2;
    const distB = (bx - cx) ** 2 + (bz - cz) ** 2;
    return distB - distA;
  });

  for (let i = 0; i < 50 && i < entries.length; i++) {
    const [key, data] = entries[i];

    let canDelete = true;
    if (state.dirtyChunks.has(key)) {
      const meta = state.chunksMeta.get(key) ?? {
        version: 1,
        seed: state.chunkGenerator.getSeed(),
        biomeId: 0,
      };
      try {
        await state.persistence.saveChunk(key, { v: 1, data, meta });
        state.dirtyChunks.delete(key);
      } catch (err) {
        console.warn("Failed to save chunk during cleanup:", key, err);
        canDelete = false;
      }
    }

    if (!canDelete) {
      continue;
    }

    state.chunksData.delete(key);
    state.chunksMeta.delete(key);

    const chunk = state.chunks.get(key);
    if (chunk) {
      state.scene.remove(chunk.mesh);
      disposeChunkMeshResources(chunk.mesh);
      state.chunks.delete(key);
    }
  }
  console.log("Memory cleanup performed.");
}

export function getBlock(
  state: ChunkManagerState,
  x: number,
  y: number,
  z: number,
): number {
  return getNeighborBlock(state, x, y, z);
}

export function setBlock(
  state: ChunkManagerState,
  x: number,
  y: number,
  z: number,
  type: number,
): void {
  const cx = Math.floor(x / state.chunkSize);
  const cz = Math.floor(z / state.chunkSize);
  const key = `${cx},${cz}`;

  const data = state.chunksData.get(key);
  if (!data) return;

  const localX = x - cx * state.chunkSize;
  const localZ = z - cz * state.chunkSize;

  if (y < 0 || y >= state.chunkHeight) return;

  const index = getBlockIndex(state, localX, y, localZ);
  data[index] = type;
  state.dirtyChunks.add(key);

  queueRebuild(state, cx, cz);

  if (localX === 0) queueRebuild(state, cx - 1, cz);
  if (localX === state.chunkSize - 1) queueRebuild(state, cx + 1, cz);
  if (localZ === 0) queueRebuild(state, cx, cz - 1);
  if (localZ === state.chunkSize - 1) queueRebuild(state, cx, cz + 1);
}

export function hasBlock(
  state: ChunkManagerState,
  x: number,
  y: number,
  z: number,
): boolean {
  return getBlock(state, x, y, z) !== BLOCK.AIR;
}

export function isChunkLoaded(
  state: ChunkManagerState,
  x: number,
  z: number,
): boolean {
  const cx = Math.floor(x / state.chunkSize);
  const cz = Math.floor(z / state.chunkSize);
  const key = `${cx},${cz}`;
  return state.chunksData.has(key);
}

export function getTopY(
  state: ChunkManagerState,
  worldX: number,
  worldZ: number,
): number {
  const cx = Math.floor(worldX / state.chunkSize);
  const cz = Math.floor(worldZ / state.chunkSize);
  const key = `${cx},${cz}`;
  const data = state.chunksData.get(key);

  if (!data) return state.chunkGenerator.getTerrainHeight(worldX, worldZ);

  const localX = worldX - cx * state.chunkSize;
  const localZ = worldZ - cz * state.chunkSize;

  for (let y = state.chunkHeight - 1; y >= 0; y--) {
    const index = getBlockIndex(state, localX, y, localZ);
    if (data[index] !== BLOCK.AIR) {
      return y;
    }
  }
  return 0;
}

export async function loadChunk(
  state: ChunkManagerState,
  cx: number,
  cz: number,
): Promise<void> {
  const key = `${cx},${cz}`;
  await ensureChunk(state, cx, cz, key);
}

export async function waitForChunk(
  state: ChunkManagerState,
  cx: number,
  cz: number,
): Promise<void> {
  const key = `${cx},${cz}`;
  if (state.chunksData.has(key)) return;

  return new Promise((resolve) => {
    const check = () => {
      if (state.chunksData.has(key)) {
        resolve();
      } else {
        ensureChunk(state, cx, cz, key);
        setTimeout(check, 100);
      }
    };
    check();
  });
}

export async function saveDirtyChunks(state: ChunkManagerState): Promise<void> {
  const toSave = new Map<string, { v: number; data: Uint8Array; meta: ChunkMeta }>();
  for (const key of state.dirtyChunks) {
    const data = state.chunksData.get(key);
    if (data) {
      const meta = state.chunksMeta.get(key) ?? {
        version: 1,
        seed: state.chunkGenerator.getSeed(),
        biomeId: 0,
      };
      toSave.set(key, { v: 1, data, meta });
    }
  }

  await state.persistence.saveBatch(toSave);
  state.dirtyChunks.clear();
}

export async function clear(
  state: ChunkManagerState,
  resetSeed: (seed: number) => void,
): Promise<void> {
  await state.persistence.clear();

  state.chunksData.clear();
  state.chunksMeta.clear();
  state.dirtyChunks.clear();
  state.inFlightChunks.clear();
  state.pendingChunks = [];
  state.pendingSet.clear();
  state.pendingMeshBuilds = [];
  state.meshFinalizeProcessing = false;
  state.rebuildQueue = [];
  state.rebuildSet.clear();

  for (const [, chunk] of state.chunks) {
    state.scene.remove(chunk.mesh);
    disposeChunkMeshResources(chunk.mesh);
  }
  state.chunks.clear();

  resetSeed(Math.floor(Math.random() * 2147483647));
}

export function dispose(state: ChunkManagerState): void {
  state.workerPool?.dispose();
  state.workerPool = undefined;
  state.useWorkers = false;
  state.useWorkerMesh = false;

  state.inFlightChunks.clear();
  state.pendingChunks = [];
  state.pendingSet.clear();
  state.pendingMeshBuilds = [];
  state.meshFinalizeProcessing = false;
  state.rebuildQueue = [];
  state.rebuildSet.clear();
  state.profiler = null;
}
