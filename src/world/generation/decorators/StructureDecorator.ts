import type { ChunkData, ChunkGenContext, IChunkDecorator } from "../../../contracts/chunks";
import { StructureGenerator } from "../StructureGenerator";
import { TerrainGenerator } from "../TerrainGenerator";

/**
 * @deprecated Legacy decorator for legacy generator benchmarks/tests.
 * Runtime structure generation uses `generation/runtime/GenerateChunk.ts`.
 */
export class StructureDecorator implements IChunkDecorator {
  private terrainGen: TerrainGenerator;

  constructor(terrainGen: TerrainGenerator) {
    this.terrainGen = terrainGen;
  }

  public decorate(chunk: ChunkData, ctx: ChunkGenContext): void {
    const structureGen = new StructureGenerator(this.terrainGen, ctx.rngForStage("structures"));

    structureGen.generateOres(
      chunk.data,
      ctx.chunkSize,
      ctx.chunkHeight,
      ctx.startX,
      ctx.startZ,
      ctx.getBlockIndex,
    );
    structureGen.generateTrees(
      chunk.data,
      ctx.chunkSize,
      ctx.chunkHeight,
      ctx.getBlockIndex,
    );
  }
}
