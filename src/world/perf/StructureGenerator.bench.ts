import { bench, describe } from "vitest";
import { StructureGenerator } from "../generation/StructureGenerator";
import { TerrainGenerator } from "../generation/TerrainGenerator";

const seed = 1337;
const chunkSize = 16;
const chunkHeight = 64;
const startX = 0;
const startZ = 0;

const getBlockIndex = (x: number, y: number, z: number) =>
  x + y * chunkSize + z * chunkSize * chunkHeight;

const terrainGen = new TerrainGenerator(seed);
const structureGen = new StructureGenerator(terrainGen);

const createBaseTerrain = () => {
  const data = new Uint8Array(chunkSize * chunkSize * chunkHeight);
  terrainGen.generateTerrain(
    data,
    chunkSize,
    chunkHeight,
    startX,
    startZ,
    getBlockIndex,
  );
  return data;
};

describe("Legacy StructureGenerator performance", () => {
  const base = createBaseTerrain();
  bench("generateTrees (16x64)", () => {
    const data = base.slice();
    structureGen.generateTrees(
      data,
      chunkSize,
      chunkHeight,
      getBlockIndex,
    );
  });
});
