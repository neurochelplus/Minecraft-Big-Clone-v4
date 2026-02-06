import { CHUNK_SIZE } from "../../constants/GameConstants";

type PregenerationOptions = {
  budgetMs?: number;
  onProgress?: (progress: number) => void;
};

export async function preGenerateAround(
  waitForChunk: (cx: number, cz: number) => Promise<void>,
  spawnX: number,
  spawnZ: number,
  radius: number,
  options?: PregenerationOptions,
): Promise<void> {
  const centerCx = Math.floor(spawnX / CHUNK_SIZE);
  const centerCz = Math.floor(spawnZ / CHUNK_SIZE);

  const coords: Array<{ cx: number; cz: number; priority: number }> = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const cx = centerCx + dx;
      const cz = centerCz + dz;
      const priority = Math.abs(dx) + Math.abs(dz);
      coords.push({ cx, cz, priority });
    }
  }

  coords.sort((a, b) => a.priority - b.priority);

  const total = Math.max(1, coords.length);
  let completed = 0;
  const budgetMs = options?.budgetMs ?? 2.5;
  let frameStart = performance.now();

  for (const item of coords) {
    await waitForChunk(item.cx, item.cz);
    completed += 1;
    options?.onProgress?.(completed / total);

    if (budgetMs > 0 && performance.now() - frameStart >= budgetMs) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      frameStart = performance.now();
    }
  }
}
