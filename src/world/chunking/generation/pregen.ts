import { GenProfiler } from "../../../utils/GenProfiler";
import type { ChunkManagerState } from "../types";
import { ensureChunk, waitNextFrame } from "./ensure";

export async function preGenerateAround(
  state: ChunkManagerState,
  spawnX: number,
  spawnZ: number,
  radius: number,
  options?: { budgetMs?: number; onProgress?: (progress: number) => void },
): Promise<void> {
  const desired = state.streamer.getDesiredChunks(
    spawnX,
    spawnZ,
    0,
    1,
    state.chunkSize,
    radius,
  );

  const total = Math.max(1, desired.length);
  let completed = 0;
  const budgetMs = options?.budgetMs ?? 2.5;
  const onProgress = options?.onProgress;
  const getNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  let frameStart = getNow();

  const prevUseWorkerMesh = state.useWorkerMesh;
  if (state.workerPool && state.useWorkers) {
    state.useWorkerMesh = true;
  }

  const pregenStart = GenProfiler.start("pregen.total");
  try {
    for (const coord of desired) {
      const key = `${coord.cx},${coord.cz}`;
      const chunkStart = GenProfiler.start("pregen.chunk");
      await ensureChunk(state, coord.cx, coord.cz, key);
      GenProfiler.end("pregen.chunk", chunkStart);

      completed += 1;
      if (onProgress) {
        onProgress(completed / total);
      }

      const elapsed = getNow() - frameStart;
      if (budgetMs > 0 && elapsed > budgetMs) {
        await waitNextFrame();
        frameStart = getNow();
      }
    }
  } finally {
    GenProfiler.end("pregen.total", pregenStart);
    state.useWorkerMesh = prevUseWorkerMesh;
  }
}
