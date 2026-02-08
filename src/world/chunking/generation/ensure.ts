import { GenProfiler } from "../../../utils/GenProfiler";
import type { ChunkData, ChunkMeshData } from "../../../contracts/chunks";
import type { ChunkManagerState } from "../types";
import { nowMs } from "../ChunkTiming";
import {
  buildChunkMesh,
  queueNeighborRebuild,
  rebuildNeighborsIfLoaded,
} from "../ChunkMeshing";

export async function waitNextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export async function ensureChunk(
  state: ChunkManagerState,
  cx: number,
  cz: number,
  key: string,
  options?: { deferNeighborRebuild?: boolean },
): Promise<void> {
  const existing = state.inFlightChunks.get(key);
  if (existing) return existing;

  const task = (async () => {
    if (state.chunksData.has(key)) {
      buildChunkMesh(state, cx, cz, state.chunksData.get(key)!);
      if (options?.deferNeighborRebuild) {
        queueNeighborRebuild(state, cx, cz);
      } else {
        rebuildNeighborsIfLoaded(state, cx, cz);
      }
      return;
    }

    if (state.persistence.hasChunk(key)) {
      if (state.persistence.isLoading(key)) return;

      const stored = await state.persistence.loadChunk(key);
      if (stored) {
        state.chunksData.set(key, stored.data);
        const meta =
          stored.meta.seed === 0
            ? { ...stored.meta, seed: state.chunkGenerator.getSeed() }
            : stored.meta;
        state.chunksMeta.set(key, meta);
        buildChunkMesh(state, cx, cz, stored.data);
      } else {
        await generateChunk(state, cx, cz);
      }
      if (options?.deferNeighborRebuild) {
        queueNeighborRebuild(state, cx, cz);
      } else {
        rebuildNeighborsIfLoaded(state, cx, cz);
      }
      return;
    }

    await generateChunk(state, cx, cz);
    if (options?.deferNeighborRebuild) {
      queueNeighborRebuild(state, cx, cz);
    } else {
      rebuildNeighborsIfLoaded(state, cx, cz);
    }
  })();

  state.inFlightChunks.set(key, task);
  try {
    await task;
  } finally {
    state.inFlightChunks.delete(key);
  }
}

export async function generateChunk(
  state: ChunkManagerState,
  cx: number,
  cz: number,
): Promise<void> {
  const key = `${cx},${cz}`;
  const chunkTotalStart = GenProfiler.start("chunk.total");
  let chunk: ChunkData;
  let meshData: ChunkMeshData | undefined;
  const profiler = state.profiler;
  const genProfilerStart = profiler ? nowMs() : 0;
  if (profiler) profiler.startSection("chunk.gen", genProfilerStart);
  if (state.workerPool && state.useWorkers) {
    const result = await state.workerPool.generateChunk(
      cx,
      cz,
      state.chunkGenerator.getSeed(),
      state.chunkSize,
      state.chunkHeight,
      state.useWorkerMesh,
    );
    chunk = result.chunk;
    meshData = result.meshData;
  } else {
    const genStart = GenProfiler.start("generation");
    chunk = state.chunkGenerator.generateChunk(cx, cz);
    GenProfiler.end("generation", genStart);
  }
  if (profiler) profiler.endSection("chunk.gen", nowMs());

  state.chunksData.set(key, chunk.data);
  state.chunksMeta.set(key, chunk.meta);
  state.dirtyChunks.add(key);
  if (meshData) {
    if (state.perfProfileName === "baseline") {
      const meshBuildStart = profiler ? nowMs() : 0;
      if (profiler) profiler.startSection("mesh.build", meshBuildStart);
      const mesh = state.meshBuilder.buildMeshFromData(
        meshData,
        cx * state.chunkSize,
        cz * state.chunkSize,
      );
      if (profiler) profiler.endSection("mesh.build", nowMs());
      state.scene.add(mesh);
      state.chunks.set(key, { mesh });
    } else {
      state.pendingMeshBuilds.push({
        cx,
        cz,
        meshData,
        enqueuedAt: nowMs(),
      });
    }
  } else {
    buildChunkMesh(state, cx, cz, chunk.data);
  }
  GenProfiler.end("chunk.total", chunkTotalStart);
}
