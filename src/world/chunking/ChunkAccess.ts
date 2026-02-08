import { BLOCK } from "../../constants/Blocks";
import type { ChunkManagerState } from "./types";

export function getBlockIndex(
  state: ChunkManagerState,
  x: number,
  y: number,
  z: number,
): number {
  return x + y * state.chunkSize + z * state.chunkSize * state.chunkHeight;
}

export function getNeighborBlock(
  state: ChunkManagerState,
  worldX: number,
  worldY: number,
  worldZ: number,
): number {
  if (worldY < 0 || worldY >= state.chunkHeight) return BLOCK.AIR;

  const cx = Math.floor(worldX / state.chunkSize);
  const cz = Math.floor(worldZ / state.chunkSize);
  const key = `${cx},${cz}`;

  const data = state.chunksData.get(key);
  if (!data) return BLOCK.AIR;

  const localX = worldX - cx * state.chunkSize;
  const localZ = worldZ - cz * state.chunkSize;

  const index = getBlockIndex(state, localX, worldY, localZ);
  return data[index];
}
