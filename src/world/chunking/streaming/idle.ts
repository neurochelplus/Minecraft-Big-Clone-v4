import type * as THREE from "three";
import type { ChunkManagerState } from "../types";
import { nowMs } from "../ChunkTiming";

export function updateIdleState(state: ChunkManagerState, playerPos: THREE.Vector3): void {
  const now = nowMs();
  if (state.lastPlayerAtMs === 0) {
    state.lastPlayerAtMs = now;
    state.lastPlayerPos.copy(playerPos);
    state.idleSinceMs = now;
    state.isIdle = true;
    return;
  }
  const dtMs = Math.max(1, now - state.lastPlayerAtMs);
  const dtSec = dtMs / 1000;
  const dist = playerPos.distanceTo(state.lastPlayerPos);
  const speed = dist / dtSec;
  state.lastPlayerAtMs = now;
  state.lastPlayerPos.copy(playerPos);

  const exitSpeed = state.idleSpeedThreshold * state.idleExitSpeedMultiplier;
  if (speed > exitSpeed) {
    state.isIdle = false;
    state.idleSinceMs = 0;
    return;
  }

  if (speed < state.idleSpeedThreshold) {
    if (state.idleSinceMs === 0) {
      state.idleSinceMs = now;
    } else if (now - state.idleSinceMs >= state.idleEnterDelayMs) {
      state.isIdle = true;
    }
  } else {
    state.idleSinceMs = 0;
  }
}

export function filterPendingToDesired(state: ChunkManagerState): void {
  if (state.desiredChunks.size === 0) return;
  state.pendingChunks = state.pendingChunks.filter((item) =>
    state.desiredChunks.has(`${item.cx},${item.cz}`),
  );
  const limit = Math.min(state.maxPendingChunks, state.idlePendingLimit);
  if (state.pendingChunks.length > limit) {
    state.pendingChunks = state.pendingChunks.slice(0, limit);
  }
  state.pendingSet.clear();
  for (const item of state.pendingChunks) {
    state.pendingSet.add(`${item.cx},${item.cz}`);
  }
}
