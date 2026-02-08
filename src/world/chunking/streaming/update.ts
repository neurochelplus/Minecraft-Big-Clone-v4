import type * as THREE from "three";
import type { ProfilerHook } from "../../../contracts/profiler";
import type { ChunkManagerState } from "../types";
import { nowMs } from "../ChunkTiming";
import { enqueueChunk, processChunkQueue } from "../ChunkGeneration";
import {
  disposeChunkMeshResources,
  processMeshFinalizeQueue,
  processRebuildQueue,
} from "../ChunkMeshing";
import { checkMemory } from "../ChunkStorage";
import { resolveBurstLimits } from "./burst";
import { adjustBudgets } from "./budget";
import { getFrameP95, getFrameP99, sampleFrameTime } from "./frame";
import { filterPendingToDesired, updateIdleState } from "./idle";
import { getStreamingRadius } from "./radius";

export function updateStreaming(
  state: ChunkManagerState,
  playerPos: THREE.Vector3,
  viewDir?: THREE.Vector3,
  profiler?: ProfilerHook,
): void {
  state.profiler = profiler ?? null;
  state.rebuildCountThisFrame = 0;
  sampleFrameTime(state);
  updateIdleState(state, playerPos);
  adjustBudgets(state);
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  const radius = getStreamingRadius(state, isMobile);

  const activeChunks = new Set<string>();
  const rawViewX = viewDir?.x ?? 0;
  const rawViewZ = viewDir?.z ?? 1;
  const viewLen = Math.hypot(rawViewX, rawViewZ);
  const viewDirX = viewLen > 0.001 ? rawViewX / viewLen : 0;
  const viewDirZ = viewLen > 0.001 ? rawViewZ / viewLen : 1;
  state.queueContext = {
    playerX: playerPos.x,
    playerZ: playerPos.z,
    viewX: viewDirX,
    viewZ: viewDirZ,
  };
  const desired = state.streamer.getDesiredChunks(
    playerPos.x,
    playerPos.z,
    viewDirX,
    viewDirZ,
    state.chunkSize,
    radius,
  );

  for (const coord of desired) {
    const key = `${coord.cx},${coord.cz}`;
    activeChunks.add(key);
    if (!state.chunks.has(key)) {
      enqueueChunk(state, coord.cx, coord.cz);
    }
  }
  state.desiredChunks = activeChunks;
  if (state.isIdle) {
    filterPendingToDesired(state);
  }

  for (const [key, chunk] of state.chunks) {
    if (!activeChunks.has(key)) {
      state.scene.remove(chunk.mesh);
      disposeChunkMeshResources(chunk.mesh);
      state.chunks.delete(key);
    }
  }

  const now = Date.now();
  if (now - state.lastCleanupAt >= state.cleanupIntervalMs) {
    state.lastCleanupAt = now;
    void checkMemory(state, playerPos);
  }

  const p95 = getFrameP95(state);
  const p99 = getFrameP99(state);
  state.frameP99Ms = p99;
  const burstLimits = resolveBurstLimits(state, nowMs(), p95, p99);
  const shouldPauseHeavy = state.isIdle && p95 > state.radiusStableMs;
  if (!shouldPauseHeavy) {
    if (state.pendingMeshBuilds.length > 0) {
      void processMeshFinalizeQueue(
        state,
        burstLimits.meshFinalizeBudgetMs,
        burstLimits.meshFinalizeMaxPerTick,
      );
    }
    if (state.pendingChunks.length > 0) {
      void processChunkQueue(
        state,
        state.runtimeGenBudgetMs,
        burstLimits.ensuresPerTick,
      );
    }
    const frameOverBudget = p95 > 16.67 || p99 > 16.67;
    if (!frameOverBudget && state.rebuildQueue.length > 0) {
      const nearLatencyHigh = state.queueNearLatencyMs > state.nearLatencyTargetMs;
      const rebuildMaxForTick = nearLatencyHigh
        ? Math.min(1, burstLimits.rebuildMaxPerTick)
        : burstLimits.rebuildMaxPerTick;
      void processRebuildQueue(
        state,
        state.runtimeRebuildBudgetMs,
        rebuildMaxForTick,
      );
    }
  }

  if (state.profiler?.recordValue) {
    state.profiler.recordValue("queue.size", state.pendingChunks.length);
    state.profiler.recordValue("queue.mesh.pending", state.pendingMeshBuilds.length);
    state.profiler.recordValue("rebuild.count", state.rebuildCountThisFrame);
    state.profiler.recordValue("queue.burst.active", state.adaptiveBurstActive ? 1 : 0);
    state.profiler.recordValue("queue.burst.enter.count", state.burstEnterCount);
    state.profiler.recordValue("queue.burst.exit.count", state.burstExitCount);
    state.profiler.recordValue("frame.local.p95", p95);
    state.profiler.recordValue("frame.local.p99", p99);
  }
}
