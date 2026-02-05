export type PerfProfileName =
  | "baseline"
  | "smooth_desktop_v1"
  | "smooth_desktop_v2";

export type PerfProfileConfig = {
  startupPregenRadius: number;
  startupPregenBudgetMs: number;
  backgroundPregenRadius: number;
  backgroundPregenBudgetMs: number;
  runtimeMaxEnsuresActive: number;
  runtimeMaxEnsuresIdle: number;
  runtimeMeshFinalizeBudgetMs: number;
  runtimeMeshFinalizeMaxPerTick: number;
  runtimeRebuildMaxPerTick: number;
  nearLatencyTargetMs: number;
  adaptiveBurstEnabled: boolean;
  burstEnterNearLatencyMs: number;
  burstExitNearLatencyMs: number;
  burstEnterFrameP95Ms: number;
  burstExitFrameP95Ms: number;
  burstFrameP99HardCapMs: number;
  burstEnsuresActive: number;
  burstEnsuresIdle: number;
  burstMeshFinalizeBudgetMs: number;
  burstMeshFinalizeMaxPerTick: number;
  burstRebuildMaxPerTick: number;
  burstMinHoldMs: number;
  burstCooldownMs: number;
};

const BASELINE_CONFIG: PerfProfileConfig = {
  startupPregenRadius: 5,
  startupPregenBudgetMs: 4,
  backgroundPregenRadius: 5,
  backgroundPregenBudgetMs: 0,
  runtimeMaxEnsuresActive: 999,
  runtimeMaxEnsuresIdle: 999,
  runtimeMeshFinalizeBudgetMs: 100,
  runtimeMeshFinalizeMaxPerTick: 999,
  runtimeRebuildMaxPerTick: 4,
  nearLatencyTargetMs: 1_000_000,
  adaptiveBurstEnabled: false,
  burstEnterNearLatencyMs: 1_000_000,
  burstExitNearLatencyMs: 0,
  burstEnterFrameP95Ms: 0,
  burstExitFrameP95Ms: 1_000_000,
  burstFrameP99HardCapMs: 16.67,
  burstEnsuresActive: 999,
  burstEnsuresIdle: 999,
  burstMeshFinalizeBudgetMs: 100,
  burstMeshFinalizeMaxPerTick: 999,
  burstRebuildMaxPerTick: 4,
  burstMinHoldMs: 0,
  burstCooldownMs: 0,
};

const SMOOTH_DESKTOP_V1_CONFIG: PerfProfileConfig = {
  startupPregenRadius: 6,
  startupPregenBudgetMs: 5,
  backgroundPregenRadius: 8,
  backgroundPregenBudgetMs: 1.5,
  runtimeMaxEnsuresActive: 1,
  runtimeMaxEnsuresIdle: 2,
  runtimeMeshFinalizeBudgetMs: 2,
  runtimeMeshFinalizeMaxPerTick: 1,
  runtimeRebuildMaxPerTick: 2,
  nearLatencyTargetMs: 180,
  adaptiveBurstEnabled: false,
  burstEnterNearLatencyMs: 1_000_000,
  burstExitNearLatencyMs: 0,
  burstEnterFrameP95Ms: 0,
  burstExitFrameP95Ms: 1_000_000,
  burstFrameP99HardCapMs: 16.67,
  burstEnsuresActive: 1,
  burstEnsuresIdle: 2,
  burstMeshFinalizeBudgetMs: 2,
  burstMeshFinalizeMaxPerTick: 1,
  burstRebuildMaxPerTick: 2,
  burstMinHoldMs: 0,
  burstCooldownMs: 0,
};

const SMOOTH_DESKTOP_V2_CONFIG: PerfProfileConfig = {
  startupPregenRadius: 6,
  startupPregenBudgetMs: 5,
  backgroundPregenRadius: 8,
  backgroundPregenBudgetMs: 1.5,
  runtimeMaxEnsuresActive: 2,
  runtimeMaxEnsuresIdle: 3,
  runtimeMeshFinalizeBudgetMs: 2.5,
  runtimeMeshFinalizeMaxPerTick: 2,
  runtimeRebuildMaxPerTick: 2,
  nearLatencyTargetMs: 250,
  adaptiveBurstEnabled: true,
  burstEnterNearLatencyMs: 320,
  burstExitNearLatencyMs: 190,
  burstEnterFrameP95Ms: 11.5,
  burstExitFrameP95Ms: 14,
  burstFrameP99HardCapMs: 16.67,
  burstEnsuresActive: 3,
  burstEnsuresIdle: 4,
  burstMeshFinalizeBudgetMs: 3,
  burstMeshFinalizeMaxPerTick: 3,
  burstRebuildMaxPerTick: 1,
  burstMinHoldMs: 600,
  burstCooldownMs: 900,
};

function readProfileName(): string | null {
  try {
    return localStorage.getItem("qf-perf-profile");
  } catch {
    return null;
  }
}

export function getPerfProfileName(): PerfProfileName {
  const raw = readProfileName();
  if (raw === "smooth_desktop_v1") {
    return "smooth_desktop_v1";
  }
  if (raw === "smooth_desktop_v2") {
    return "smooth_desktop_v2";
  }
  return "baseline";
}

export function getPerfProfile(): PerfProfileConfig {
  const profileName = getPerfProfileName();
  if (profileName === "smooth_desktop_v1") {
    return { ...SMOOTH_DESKTOP_V1_CONFIG };
  }
  if (profileName === "smooth_desktop_v2") {
    return { ...SMOOTH_DESKTOP_V2_CONFIG };
  }
  return { ...BASELINE_CONFIG };
}
