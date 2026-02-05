import type { ChunkData, ChunkGenContext, IChunkDecorator, IChunkSource } from "../../contracts/chunks";
import { RngStreams, hashSeed } from "../../utils/Rng";
import { TerrainGenerator } from "./TerrainGenerator";
import { GenProfiler } from "../../utils/GenProfiler";

export type ChunkGeneratorOptions = {
  chunkSize: number;
  chunkHeight: number;
  decorators?: IChunkDecorator[];
  terrainGen?: TerrainGenerator;
};

export class ChunkGenerator implements IChunkSource {
  private seed: number;
  private chunkSize: number;
  private chunkHeight: number;
  private terrainGen: TerrainGenerator;
  private decorators: IChunkDecorator[];

  constructor(seed: number, options: ChunkGeneratorOptions) {
    this.seed = seed;
    this.chunkSize = options.chunkSize;
    this.chunkHeight = options.chunkHeight;
    this.terrainGen = options.terrainGen ?? new TerrainGenerator(seed);
    this.decorators = options.decorators ?? [];
  }

  public getSeed(): number {
    return this.seed;
  }

  public setSeed(seed: number): void {
    this.seed = seed;
    this.terrainGen.setSeed(seed);
  }

  public getTerrainHeight(worldX: number, worldZ: number): number {
    return this.terrainGen.getTerrainHeight(worldX, worldZ);
  }

  public generateChunk(cx: number, cz: number): ChunkData {
    const data = new Uint8Array(this.chunkSize * this.chunkSize * this.chunkHeight);
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;
    const chunkSeed = hashSeed(this.seed, `chunk:${cx},${cz}`);
    const chunkStreams = new RngStreams(chunkSeed);

    const terrainStart = GenProfiler.start("terrain");
    this.terrainGen.generateTerrain(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      this.getBlockIndex.bind(this),
    );
    GenProfiler.end("terrain", terrainStart);

    const meta = { version: 1, seed: this.seed, biomeId: 0 };
    const chunk: ChunkData = { data, meta };
    const ctx: ChunkGenContext = {
      cx,
      cz,
      startX,
      startZ,
      chunkSize: this.chunkSize,
      chunkHeight: this.chunkHeight,
      getBlockIndex: this.getBlockIndex.bind(this),
      rngForStage: (label) => chunkStreams.forStage(label),
    };

    for (const decorator of this.decorators) {
      const label = `decorator.${decorator.constructor.name}`;
      const decoStart = GenProfiler.start(label);
      decorator.decorate(chunk, ctx);
      GenProfiler.end(label, decoStart);
    }

    return chunk;
  }

  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
  }
}
