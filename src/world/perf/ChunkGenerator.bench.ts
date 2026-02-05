import { bench, describe } from "vitest";
import { ChunkGenerator } from "../generation/ChunkGenerator";
import { TerrainGenerator } from "../TerrainGenerator";
import { RngStreams } from "../../utils/Rng";
import { BiomeDecorator } from "../generation/decorators/BiomeDecorator";
import { CaveDecorator } from "../generation/decorators/CaveDecorator";
import { StructureDecorator } from "../generation/decorators/StructureDecorator";
import { PostProcessDecorator } from "../generation/decorators/PostProcessDecorator";

const createGenerator = (seed: number, size = 16, height = 64) => {
  const streams = new RngStreams(seed);
  const terrainGen = new TerrainGenerator(seed);
  const decorators = [
    new BiomeDecorator(streams.forStage("biomes")),
    new CaveDecorator(streams.forStage("caves"), false),
    new StructureDecorator(terrainGen),
    new PostProcessDecorator(),
  ];
  return new ChunkGenerator(seed, {
    chunkSize: size,
    chunkHeight: height,
    decorators,
    terrainGen,
  });
};

describe("ChunkGenerator performance", () => {
  const gen = createGenerator(1337);
  bench("generateChunk (16x64)", () => {
    gen.generateChunk(0, 0);
  });
});
