import type { ChunkData, ChunkGenContext, IChunkDecorator } from "../../../contracts/chunks";

export class PostProcessDecorator implements IChunkDecorator {
  public decorate(_chunk: ChunkData, _ctx: ChunkGenContext): void {
    // Placeholder for biome edge blending, surface corrections, etc.
  }
}
