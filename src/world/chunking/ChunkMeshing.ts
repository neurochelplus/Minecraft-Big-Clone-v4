import * as THREE from "three";
import { GenProfiler } from "../../utils/GenProfiler";
import { nowMs } from "./ChunkTiming";
import { getBlockIndex, getNeighborBlock } from "./ChunkAccess";
import type { ChunkManagerState } from "./types";

export function buildChunkMesh(
  state: ChunkManagerState,
  cx: number,
  cz: number,
  data: Uint8Array,
): void {
  const key = `${cx},${cz}`;
  if (state.chunks.has(key)) return;

  const profiler = state.profiler;
  const meshProfilerStart = profiler ? nowMs() : 0;
  if (profiler) profiler.startSection("mesh.build", meshProfilerStart);
  const meshStart = GenProfiler.start("mesh");
  const mesh = state.meshBuilder.buildMesh(
    data,
    cx,
    cz,
    state.chunkSize,
    state.chunkHeight,
    (x, y, z) => getBlockIndex(state, x, y, z),
    (worldX, worldY, worldZ) => getNeighborBlock(state, worldX, worldY, worldZ),
  );
  GenProfiler.end("mesh", meshStart);
  if (profiler) profiler.endSection("mesh.build", nowMs());

  state.scene.add(mesh);
  state.chunks.set(key, { mesh });
}

export function rebuildChunkMesh(state: ChunkManagerState, cx: number, cz: number): void {
  state.rebuildCountThisFrame += 1;
  const key = `${cx},${cz}`;
  const chunk = state.chunks.get(key);
  if (chunk) {
    state.scene.remove(chunk.mesh);
    disposeChunkMeshResources(chunk.mesh);
    state.chunks.delete(key);
  }

  const data = state.chunksData.get(key);
  if (data) {
    buildChunkMesh(state, cx, cz, data);
  }
}

export function disposeChunkMeshResources(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  const material = mesh.material;
  if (Array.isArray(material)) {
    for (const item of material) {
      if (!isSharedChunkMaterial(mesh, item)) {
        item.dispose();
      }
    }
    return;
  }
  if (!isSharedChunkMaterial(mesh, material)) {
    material.dispose();
  }
}

function isSharedChunkMaterial(mesh: THREE.Mesh, material: THREE.Material): boolean {
  const meshShared = Boolean(
    (mesh.userData as { qfSharedChunkMaterial?: boolean }).qfSharedChunkMaterial,
  );
  const materialShared = Boolean(
    (material.userData as { qfSharedChunkMaterial?: boolean } | undefined)
      ?.qfSharedChunkMaterial,
  );
  return meshShared || materialShared;
}

export function rebuildNeighborsIfLoaded(
  state: ChunkManagerState,
  cx: number,
  cz: number,
): void {
  const targets = [
    [cx - 1, cz],
    [cx + 1, cz],
    [cx, cz - 1],
    [cx, cz + 1],
  ];
  for (const [tx, tz] of targets) {
    queueRebuild(state, tx, tz);
  }
}

export function queueRebuild(state: ChunkManagerState, cx: number, cz: number): void {
  const key = `${cx},${cz}`;
  if (!state.chunksData.has(key)) return;
  if (state.rebuildSet.has(key)) return;
  if (state.isIdle && state.desiredChunks.size > 0 && !state.desiredChunks.has(key)) return;
  if (state.rebuildQueue.length >= state.maxRebuildQueue) return;
  state.rebuildSet.add(key);
  state.rebuildQueue.push({ cx, cz });
}

export function queueNeighborRebuild(
  state: ChunkManagerState,
  cx: number,
  cz: number,
): void {
  const targets = [
    [cx - 1, cz],
    [cx + 1, cz],
    [cx, cz - 1],
    [cx, cz + 1],
  ];
  for (const [tx, tz] of targets) {
    queueRebuild(state, tx, tz);
  }
}

export async function processMeshFinalizeQueue(
  state: ChunkManagerState,
  budgetMs: number,
  maxPerTick: number,
): Promise<void> {
  if (state.meshFinalizeProcessing) return;
  state.meshFinalizeProcessing = true;
  const profiler = state.profiler;
  const tickStart = nowMs();
  let processed = 0;
  let latencyTotal = 0;
  try {
    sortPendingMeshByPriority(state);
    while (state.pendingMeshBuilds.length > 0) {
      const next = state.pendingMeshBuilds.shift();
      if (!next) break;

      const key = `${next.cx},${next.cz}`;
      if (state.chunks.has(key) || !state.chunksData.has(key)) {
        continue;
      }
      if (state.desiredChunks.size > 0 && !state.desiredChunks.has(key)) {
        continue;
      }

      const sectionStart = profiler ? nowMs() : 0;
      if (profiler) profiler.startSection("mesh.finalize", sectionStart);
      const mesh = state.meshBuilder.buildMeshFromData(
        next.meshData,
        next.cx * state.chunkSize,
        next.cz * state.chunkSize,
      );
      if (profiler) profiler.endSection("mesh.finalize", nowMs());
      state.scene.add(mesh);
      state.chunks.set(key, { mesh });
      processed += 1;
      latencyTotal += nowMs() - next.enqueuedAt;

      if (maxPerTick > 0 && processed >= maxPerTick) {
        break;
      }
      if (budgetMs > 0 && nowMs() - tickStart > budgetMs) {
        break;
      }
    }
  } finally {
    state.meshFinalizeProcessing = false;
    if (profiler?.recordValue) {
      const latencyAvg = processed > 0 ? latencyTotal / processed : 0;
      profiler.recordValue("queue.mesh.pending", state.pendingMeshBuilds.length);
      profiler.recordValue("queue.mesh.latency", latencyAvg);
      profiler.recordValue("queue.mesh.processed", processed);
    }
  }
}

export async function processRebuildQueue(
  state: ChunkManagerState,
  budgetMs: number,
  maxPerTick?: number,
): Promise<void> {
  if (state.isIdle && state.desiredChunks.size > 0) {
    state.rebuildQueue = state.rebuildQueue.filter((item) =>
      state.desiredChunks.has(`${item.cx},${item.cz}`),
    );
    state.rebuildSet.clear();
    for (const item of state.rebuildQueue) {
      state.rebuildSet.add(`${item.cx},${item.cz}`);
    }
  }
  const start = nowMs();
  let processed = 0;
  const effectiveMax =
    maxPerTick !== undefined ? maxPerTick : state.runtimeRebuildMax;
  while (state.rebuildQueue.length > 0) {
    const next = state.rebuildQueue.shift();
    if (!next) break;
    const key = `${next.cx},${next.cz}`;
    state.rebuildSet.delete(key);
    if (state.chunksData.has(key)) {
      rebuildChunkMesh(state, next.cx, next.cz);
      processed += 1;
    }
    if (effectiveMax > 0 && processed >= effectiveMax) {
      break;
    }
    if (budgetMs > 0 && nowMs() - start > budgetMs) {
      break;
    }
  }
}

function sortPendingMeshByPriority(state: ChunkManagerState): void {
  if (state.pendingMeshBuilds.length <= 1) return;
  state.pendingMeshBuilds.sort((a, b) => {
    return getPendingMeshPriority(state, a) - getPendingMeshPriority(state, b);
  });
}

function getPendingMeshPriority(
  state: ChunkManagerState,
  item: { cx: number; cz: number },
): number {
  const ctx = state.queueContext;
  const centerX = (item.cx + 0.5) * state.chunkSize;
  const centerZ = (item.cz + 0.5) * state.chunkSize;
  if (!ctx) {
    const dx = centerX;
    const dz = centerZ;
    return dx * dx + dz * dz;
  }
  const dx = centerX - ctx.playerX;
  const dz = centerZ - ctx.playerZ;
  const distSq = dx * dx + dz * dz;
  const dot = dx * ctx.viewX + dz * ctx.viewZ;
  return distSq - Math.max(0, dot) * state.queueForwardBias;
}
