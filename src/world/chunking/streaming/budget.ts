import type { ChunkManagerState } from "../types";
import { nowMs } from "../ChunkTiming";
import { getFrameP95 } from "./frame";

export function adjustBudgets(state: ChunkManagerState): void {
  const p95 = getFrameP95(state);
  const now = nowMs();
  if (now - state.lastBudgetAdjustAt < state.budgetAdjustCooldownMs) {
    return;
  }
  if (state.isIdle && p95 < state.radiusStableMs) {
    return;
  }
  if (p95 > state.radiusP95TargetMs) {
    const nextGen = Math.max(
      state.runtimeGenBudgetMinMs,
      state.runtimeGenBudgetMs - state.runtimeGenBudgetStepMs,
    );
    const nextRebuild = Math.max(
      state.runtimeRebuildBudgetMinMs,
      state.runtimeRebuildBudgetMs - state.runtimeRebuildBudgetStepMs,
    );
    if (nextGen !== state.runtimeGenBudgetMs || nextRebuild !== state.runtimeRebuildBudgetMs) {
      state.runtimeGenBudgetMs = nextGen;
      state.runtimeRebuildBudgetMs = nextRebuild;
      state.lastBudgetAdjustAt = now;
    }
    return;
  }
  if (p95 > 0 && p95 < state.radiusStableMs) {
    const nextGen = Math.min(
      state.runtimeGenBudgetMaxMs,
      state.runtimeGenBudgetMs + state.runtimeGenBudgetStepMs,
    );
    const nextRebuild = Math.min(
      state.runtimeRebuildBudgetMaxMs,
      state.runtimeRebuildBudgetMs + state.runtimeRebuildBudgetStepMs,
    );
    if (nextGen !== state.runtimeGenBudgetMs || nextRebuild !== state.runtimeRebuildBudgetMs) {
      state.runtimeGenBudgetMs = nextGen;
      state.runtimeRebuildBudgetMs = nextRebuild;
      state.lastBudgetAdjustAt = now;
    }
  }
}
