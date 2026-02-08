import { createNoise3D } from "simplex-noise";
import type { ChunkData, ChunkGenContext, IChunkDecorator } from "../../../contracts/chunks";
import { BLOCK } from "../../../constants/Blocks";
import { Rng } from "../../../utils/Rng";

export class CaveDecorator implements IChunkDecorator {
  private noise3D: (x: number, y: number, z: number) => number;
  private enabled: boolean;
  private step: number;
  private threshold: number;

  constructor(rng: Rng, enabled: boolean = false, step: number = 1, threshold = 0.55) {
    this.noise3D = createNoise3D(() => rng.next());
    this.enabled = enabled;
    this.step = Math.max(1, Math.floor(step));
    this.threshold = threshold;
  }

  public decorate(chunk: ChunkData, ctx: ChunkGenContext): void {
    if (!this.enabled) return;

    const { data } = chunk;
    const threshold = this.threshold;
    const step = this.step;

    for (let x = 0; x < ctx.chunkSize; x += step) {
      for (let z = 0; z < ctx.chunkSize; z += step) {
        for (let y = 4; y < ctx.chunkHeight - 10; y += step) {
          const worldX = ctx.startX + x;
          const worldZ = ctx.startZ + z;
          const value = this.noise3D(worldX / 40, y / 20, worldZ / 40);
          if (value > threshold) {
            const index = ctx.getBlockIndex(x, y, z);
            if (data[index] !== BLOCK.BEDROCK) {
              data[index] = BLOCK.AIR;
            }
          }
        }
      }
    }
  }
}
