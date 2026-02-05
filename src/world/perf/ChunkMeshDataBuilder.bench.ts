import { bench, describe } from "vitest";
import { ChunkMeshDataBuilder } from "../mesh/ChunkMeshDataBuilder";
import { ChunkGenerator } from "../generation/ChunkGenerator";
import { TerrainGenerator } from "../TerrainGenerator";
import { RngStreams } from "../../utils/Rng";
import { BiomeDecorator } from "../generation/decorators/BiomeDecorator";
import { CaveDecorator } from "../generation/decorators/CaveDecorator";
import { StructureDecorator } from "../generation/decorators/StructureDecorator";
import { PostProcessDecorator } from "../generation/decorators/PostProcessDecorator";
import { BLOCK } from "../../constants/Blocks";

const seed = 1337;
const chunkSize = 16;
const chunkHeight = 64;

const streams = new RngStreams(seed);
const terrainGen = new TerrainGenerator(seed);
const decorators = [
  new BiomeDecorator(streams.forStage("biomes")),
  new CaveDecorator(streams.forStage("caves"), false),
  new StructureDecorator(terrainGen),
  new PostProcessDecorator(),
];
const generator = new ChunkGenerator(seed, {
  chunkSize,
  chunkHeight,
  decorators,
  terrainGen,
});
const chunk = generator.generateChunk(0, 0);

const getBlockIndex = (x: number, y: number, z: number) =>
  x + y * chunkSize + z * chunkSize * chunkHeight;

const getNeighborBlock = (worldX: number, worldY: number, worldZ: number) => {
  if (worldY < 0 || worldY >= chunkHeight) return BLOCK.AIR;
  const localX = worldX;
  const localZ = worldZ;
  if (
    localX < 0 ||
    localX >= chunkSize ||
    localZ < 0 ||
    localZ >= chunkSize
  ) {
    return BLOCK.AIR;
  }
  const index = getBlockIndex(localX, worldY, localZ);
  return chunk.data[index];
};

describe("ChunkMeshDataBuilder performance", () => {
  bench("buildMeshData (16x64)", () => {
    ChunkMeshDataBuilder.buildMeshData(
      chunk.data,
      0,
      0,
      chunkSize,
      chunkHeight,
      getBlockIndex,
      getNeighborBlock,
    );
  });
});
