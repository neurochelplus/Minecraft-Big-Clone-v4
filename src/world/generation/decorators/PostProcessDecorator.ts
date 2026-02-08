import type { ChunkData, ChunkGenContext, IChunkDecorator } from "../../../contracts/chunks";

/**
 * @deprecated Legacy decorator for legacy generator benchmarks/tests.
 * Runtime post-processing uses `generation/runtime/GenerateChunk.ts`.
 */
export class PostProcessDecorator implements IChunkDecorator {
  public decorate(_chunk: ChunkData, _ctx: ChunkGenContext): void {
    // Placeholder for biome edge blending, surface corrections, etc.
  }
}
