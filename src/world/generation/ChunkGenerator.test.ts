import { describe, expect, it } from "vitest";
import { ChunkGenerator } from "./ChunkGenerator";
import { TerrainGenerator } from "./TerrainGenerator";
import { RngStreams } from "../../utils/Rng";
import { BiomeDecorator } from "./decorators/BiomeDecorator";
import { CaveDecorator } from "./decorators/CaveDecorator";
import { StructureDecorator } from "./decorators/StructureDecorator";
import { PostProcessDecorator } from "./decorators/PostProcessDecorator";

const createGenerator = (seed: number, size = 8, height = 16) => {
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

describe("Legacy ChunkGenerator", () => {
  it("is deterministic for the same seed", () => {
    const gen = createGenerator(123);
    const a = gen.generateChunk(0, 0);
    const b = gen.generateChunk(0, 0);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
  });

  it("differs for different seeds", () => {
    const genA = createGenerator(123);
    const genB = createGenerator(456);
    const a = genA.generateChunk(0, 0);
    const b = genB.generateChunk(0, 0);
    expect(Array.from(a.data)).not.toEqual(Array.from(b.data));
  });

  it("includes metadata version", () => {
    const gen = createGenerator(123);
    const chunk = gen.generateChunk(0, 0);
    expect(chunk.meta.version).toBe(1);
  });
});
