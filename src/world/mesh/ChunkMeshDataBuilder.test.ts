import { describe, expect, it } from "vitest";
import { ChunkMeshDataBuilder } from "./ChunkMeshDataBuilder";
import { BLOCK } from "../../constants/Blocks";

describe("ChunkMeshDataBuilder", () => {
  it("builds mesh data for a single block", () => {
    const chunkSize = 2;
    const chunkHeight = 2;
    const data = new Uint8Array(chunkSize * chunkSize * chunkHeight);
    const getBlockIndex = (x: number, y: number, z: number) =>
      x + y * chunkSize + z * chunkSize * chunkHeight;
    data[getBlockIndex(0, 0, 0)] = BLOCK.GRASS;

    const meshData = ChunkMeshDataBuilder.buildMeshData(
      data,
      0,
      0,
      chunkSize,
      chunkHeight,
      getBlockIndex,
      (x, y, z) => {
        if (y < 0 || y >= chunkHeight) return BLOCK.AIR;
        const localX = x;
        const localZ = z;
        if (localX < 0 || localX >= chunkSize || localZ < 0 || localZ >= chunkSize) {
          return BLOCK.AIR;
        }
        return data[getBlockIndex(localX, y, localZ)];
      },
    );

    expect(meshData.positions.length).toBeGreaterThan(0);
    expect(meshData.indices.length).toBeGreaterThan(0);
  });
});
