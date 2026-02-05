// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { getPerfProfile, getPerfProfileName } from "./PerfProfile";

describe("PerfProfile", () => {
  afterEach(() => {
    localStorage.removeItem("qf-perf-profile");
  });

  it("uses baseline when profile flag is missing", () => {
    const profile = getPerfProfile();
    expect(getPerfProfileName()).toBe("baseline");
    expect(profile.runtimeRebuildMaxPerTick).toBe(4);
    expect(profile.backgroundPregenRadius).toBe(profile.startupPregenRadius);
  });

  it("reads smooth_desktop_v1 from localStorage", () => {
    localStorage.setItem("qf-perf-profile", "smooth_desktop_v1");
    const profile = getPerfProfile();
    expect(getPerfProfileName()).toBe("smooth_desktop_v1");
    expect(profile.startupPregenRadius).toBe(6);
    expect(profile.backgroundPregenRadius).toBe(8);
    expect(profile.runtimeMaxEnsuresActive).toBe(1);
    expect(profile.runtimeMeshFinalizeMaxPerTick).toBe(1);
    expect(profile.nearLatencyTargetMs).toBe(180);
    expect(profile.adaptiveBurstEnabled).toBe(false);
  });

  it("reads smooth_desktop_v2 from localStorage", () => {
    localStorage.setItem("qf-perf-profile", "smooth_desktop_v2");
    const profile = getPerfProfile();
    expect(getPerfProfileName()).toBe("smooth_desktop_v2");
    expect(profile.runtimeMaxEnsuresActive).toBe(2);
    expect(profile.runtimeMeshFinalizeBudgetMs).toBe(2.5);
    expect(profile.nearLatencyTargetMs).toBe(250);
    expect(profile.adaptiveBurstEnabled).toBe(true);
    expect(profile.burstEnterNearLatencyMs).toBe(320);
    expect(profile.burstExitNearLatencyMs).toBe(190);
    expect(profile.burstFrameP99HardCapMs).toBe(16.67);
    expect(profile.burstEnsuresActive).toBe(3);
    expect(profile.burstMeshFinalizeMaxPerTick).toBe(3);
  });

  it("falls back to baseline for unknown values", () => {
    localStorage.setItem("qf-perf-profile", "unknown-profile");
    const profile = getPerfProfile();
    expect(getPerfProfileName()).toBe("baseline");
    expect(profile.runtimeMaxEnsuresActive).toBe(999);
    expect(profile.runtimeMeshFinalizeBudgetMs).toBe(100);
  });
});
