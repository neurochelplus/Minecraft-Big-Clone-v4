import type { ChunkCoord, IChunkStreamer } from "../../contracts/chunks";

export class ChunkStreamer implements IChunkStreamer {
  public getDesiredChunks(
    playerX: number,
    playerZ: number,
    viewDirX: number,
    viewDirZ: number,
    chunkSize: number,
    radius: number,
  ): ChunkCoord[] {
    const cx = Math.floor(playerX / chunkSize);
    const cz = Math.floor(playerZ / chunkSize);
    const dirLen = Math.hypot(viewDirX, viewDirZ) || 1;
    const dirX = viewDirX / dirLen;
    const dirZ = viewDirZ / dirLen;

    const result: Array<ChunkCoord & { score: number }> = [];
    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let z = cz - radius; z <= cz + radius; z++) {
        const dx = x - cx;
        const dz = z - cz;
        const dist = Math.hypot(dx, dz);
        const norm = dist === 0 ? 0 : dist;
        const angleScore = norm === 0 ? 0 : 1 - ((dx / norm) * dirX + (dz / norm) * dirZ);
        const score = dist + angleScore * 0.75;
        result.push({ cx: x, cz: z, score });
      }
    }

    result.sort((a, b) => a.score - b.score);
    return result.map(({ cx, cz }) => ({ cx, cz }));
  }
}
