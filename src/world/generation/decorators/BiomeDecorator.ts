import { createNoise2D } from "simplex-noise";
import type { ChunkData, ChunkGenContext, IChunkDecorator } from "../../../contracts/chunks";
import { Rng } from "../../../utils/Rng";

export class BiomeDecorator implements IChunkDecorator {
  private noise2D: (x: number, y: number) => number;

  constructor(rng: Rng) {
    this.noise2D = createNoise2D(() => rng.next());
  }

  public decorate(chunk: ChunkData, ctx: ChunkGenContext): void {
    const centerX = ctx.startX + ctx.chunkSize / 2;
    const centerZ = ctx.startZ + ctx.chunkSize / 2;
    const value = this.noise2D(centerX / 200, centerZ / 200);
    chunk.meta.biomeId = value > 0 ? 1 : 0;
  }
}
