import type { ChunkManagerState } from "../types";
import { nowMs } from "../ChunkTiming";
import {
  FAR_TRIM_RADIUS_ACTIVE_CHUNKS,
  FAR_TRIM_RADIUS_IDLE_CHUNKS,
  NEAR_LATENCY_RADIUS_CHUNKS,
  NEAR_PRIORITY_RADIUS_CHUNKS,
} from "./constants";
import { ensureChunk, waitNextFrame } from "./ensure";

type PendingChunk = { cx: number; cz: number; enqueuedAt: number };

export function enqueueChunk(state: ChunkManagerState, cx: number, cz: number): void {
  const key = `${cx},${cz}`;
  if (state.pendingSet.has(key)) return;
  state.pendingSet.add(key);
  state.pendingChunks.push({ cx, cz, enqueuedAt: nowMs() });
  if (state.pendingChunks.length > state.maxPendingChunks) {
    trimPendingQueue(state);
  }
  if (state.isIdle && state.pendingChunks.length > state.idlePendingLimit) {
    trimPendingQueue(state);
  }
}

export async function processChunkQueue(
  state: ChunkManagerState,
  budgetMs: number,
  maxEnsuresOverride?: number,
): Promise<void> {
  if (state.processingQueue) return;
  state.processingQueue = true;
  const profiler = state.profiler;

  const prevUseWorkerMesh = state.useWorkerMesh;
  if (state.workerPool && state.useWorkers) {
    state.useWorkerMesh = true;
  }

  try {
    while (state.pendingChunks.length > 0) {
      sortPendingByPriority(state);
      const frameStart = nowMs();
      const queueWallStart = profiler ? nowMs() : 0;
      if (profiler) profiler.startSection("chunk.queue.wall", queueWallStart);
      let processed = 0;
      let latencyTotal = 0;
      let nearLatencyTotal = 0;
      let nearProcessed = 0;
      let queueCpuMs = 0;
      let ensuresProcessed = 0;
      const maxEnsures =
        maxEnsuresOverride ??
        (state.isIdle ? state.runtimeMaxEnsuresIdle : state.runtimeMaxEnsuresActive);
      while (state.pendingChunks.length > 0) {
        const itemStart = nowMs();
        const next = state.pendingChunks.shift();
        if (!next) break;
        const key = `${next.cx},${next.cz}`;
        state.pendingSet.delete(key);
        if (!isDesired(state, key)) {
          queueCpuMs += nowMs() - itemStart;
          continue;
        }
        const latency = nowMs() - next.enqueuedAt;
        latencyTotal += latency;
        processed += 1;
        if (isNearQueueItem(state, next, NEAR_LATENCY_RADIUS_CHUNKS)) {
          nearLatencyTotal += latency;
          nearProcessed += 1;
        }
        queueCpuMs += nowMs() - itemStart;
        ensuresProcessed += 1;
        await ensureChunk(state, next.cx, next.cz, key, { deferNeighborRebuild: true });

        if (maxEnsures > 0 && ensuresProcessed >= maxEnsures) {
          break;
        }
        if (budgetMs > 0 && nowMs() - frameStart > budgetMs) {
          break;
        }
      }
      const nearLatencyAvg = nearProcessed > 0 ? nearLatencyTotal / nearProcessed : 0;
      state.queueNearLatencyMs = nearLatencyAvg;
      if (profiler?.recordValue) {
        const latencyAvg = processed > 0 ? latencyTotal / processed : 0;
        profiler.recordValue("queue.latency", latencyAvg);
        profiler.recordValue("queue.near.latency", nearLatencyAvg);
        profiler.recordValue("queue.cpu", queueCpuMs);
        profiler.recordValue("queue.processed", processed);
        profiler.recordValue("queue.near.processed", nearProcessed);
        profiler.recordValue("queue.ensure.processed", ensuresProcessed);
      }
      if (profiler) profiler.endSection("chunk.queue.wall", nowMs());
      await waitNextFrame();
    }
  } finally {
    state.useWorkerMesh = prevUseWorkerMesh;
    state.processingQueue = false;
  }
}

function isDesired(state: ChunkManagerState, key: string): boolean {
  if (state.desiredChunks.size === 0) return true;
  return state.desiredChunks.has(key);
}

function sortPendingByPriority(state: ChunkManagerState): void {
  if (state.pendingChunks.length <= 1) return;
  state.pendingChunks.sort((a, b) => {
    return getPriorityScore(state, a) - getPriorityScore(state, b);
  });
}

function trimPendingQueue(state: ChunkManagerState): void {
  if (state.pendingChunks.length === 0) return;
  if (state.desiredChunks.size > 0) {
    state.pendingChunks = state.pendingChunks.filter((item) =>
      state.desiredChunks.has(`${item.cx},${item.cz}`),
    );
  }
  const limit = state.isIdle
    ? Math.min(state.maxPendingChunks, state.idlePendingLimit)
    : state.maxPendingChunks;
  if (state.pendingChunks.length > limit) {
    const trimRadius = state.isIdle
      ? FAR_TRIM_RADIUS_IDLE_CHUNKS
      : FAR_TRIM_RADIUS_ACTIVE_CHUNKS;
    const minKeep = Math.max(12, Math.floor(limit * 0.35));
    pruneFarPendingQueue(state, trimRadius, minKeep);
  }
  if (state.pendingChunks.length <= limit) {
    state.pendingSet.clear();
    for (const item of state.pendingChunks) {
      state.pendingSet.add(`${item.cx},${item.cz}`);
    }
    return;
  }
  sortPendingByPriority(state);
  state.pendingChunks = state.pendingChunks.slice(0, limit);
  state.pendingSet.clear();
  for (const item of state.pendingChunks) {
    state.pendingSet.add(`${item.cx},${item.cz}`);
  }
}

function pruneFarPendingQueue(
  state: ChunkManagerState,
  radiusChunks: number,
  minKeep: number,
): void {
  if (!state.queueContext) return;
  const maxDistSq = (radiusChunks * state.chunkSize) ** 2;
  const filtered = state.pendingChunks.filter(
    (item) => getDistanceSqToPlayer(state, item) <= maxDistSq,
  );
  if (filtered.length >= minKeep) {
    state.pendingChunks = filtered;
  }
}

function getPriorityScore(state: ChunkManagerState, item: { cx: number; cz: number }): number {
  const ctx = state.queueContext;
  const distSq = getDistanceSqToPlayer(state, item);
  if (!ctx) return distSq;
  const centerX = (item.cx + 0.5) * state.chunkSize;
  const centerZ = (item.cz + 0.5) * state.chunkSize;
  const dx = centerX - ctx.playerX;
  const dz = centerZ - ctx.playerZ;
  const dot = dx * ctx.viewX + dz * ctx.viewZ;
  const nearRadiusSq = (NEAR_PRIORITY_RADIUS_CHUNKS * state.chunkSize) ** 2;
  const nearBoost = distSq <= nearRadiusSq ? state.chunkSize * state.chunkSize * 24 : 0;
  const forwardBoost = Math.max(0, dot) * state.queueForwardBias * 1.35;
  const backwardPenalty = Math.max(0, -dot) * state.queueForwardBias * 0.35;
  return distSq - nearBoost - forwardBoost + backwardPenalty;
}

function getDistanceSqToPlayer(state: ChunkManagerState, item: { cx: number; cz: number }): number {
  const centerX = (item.cx + 0.5) * state.chunkSize;
  const centerZ = (item.cz + 0.5) * state.chunkSize;
  const ctx = state.queueContext;
  if (!ctx) {
    return centerX * centerX + centerZ * centerZ;
  }
  const dx = centerX - ctx.playerX;
  const dz = centerZ - ctx.playerZ;
  return dx * dx + dz * dz;
}

function isNearQueueItem(
  state: ChunkManagerState,
  item: PendingChunk,
  radiusChunks: number,
): boolean {
  const radiusSq = (radiusChunks * state.chunkSize) ** 2;
  return getDistanceSqToPlayer(state, item) <= radiusSq;
}
