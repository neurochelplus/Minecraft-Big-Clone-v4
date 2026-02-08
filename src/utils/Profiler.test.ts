// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { FrameProfiler, ProfilerOverlay } from "./Profiler";

describe("FrameProfiler", () => {
  it("computes frame stats from recent samples", () => {
    const profiler = new FrameProfiler({ sampleSize: 2 });

    profiler.startFrame(0);
    profiler.endFrame(10);

    profiler.startFrame(10);
    profiler.endFrame(30);

    profiler.startFrame(30);
    profiler.endFrame(60);

    const stats = profiler.getStats();

    expect(stats.frame.avg).toBeCloseTo(25, 5);
    expect(stats.frame.max).toBeCloseTo(30, 5);
    expect(stats.frame.last).toBeCloseTo(30, 5);
    expect(stats.frame.min).toBeCloseTo(20, 5);
    expect(stats.frame.p95).toBeCloseTo(30, 5);
    expect(stats.frame.p99).toBeCloseTo(30, 5);
    expect(stats.frame.count).toBe(3);
    expect(stats.fps).toBeCloseTo(1000 / 25, 5);
    expect(stats.fpsLast).toBeCloseTo(1000 / 30, 5);
    expect(stats.frameSamples).toHaveLength(2);
    expect(stats.frameSamples[1]).toBeCloseTo(30, 5);
  });

  it("tracks section timings", () => {
    const profiler = new FrameProfiler({ sampleSize: 3 });

    profiler.startSection("update", 0);
    profiler.endSection("update", 5);

    profiler.startSection("update", 10);
    profiler.endSection("update", 18);

    const stats = profiler.getStats();

    expect(stats.sections.update.avg).toBeCloseTo(6.5, 5);
    expect(stats.sections.update.max).toBeCloseTo(8, 5);
    expect(stats.sections.update.last).toBeCloseTo(8, 5);
    expect(stats.sections.update.min).toBeCloseTo(5, 5);
    expect(stats.sections.update.p95).toBeCloseTo(8, 5);
    expect(stats.sections.update.p99).toBeCloseTo(8, 5);
    expect(stats.sections.update.count).toBe(2);
  });
});

describe("ProfilerOverlay", () => {
  it("creates and updates DOM overlay", () => {
    const overlay = new ProfilerOverlay();

    overlay.setVisible(true);
    overlay.update({
      fps: 60,
      fpsLast: 58,
      frame: {
        count: 120,
        avg: 16.67,
        max: 18.2,
        last: 16.4,
        min: 15.9,
        p95: 18,
        p99: 18.2,
      },
      frameSamples: [15.5, 16.2, 17.8, 16.4],
      sampleSize: 120,
      budgetMs: 16.67,
      freezeThresholdMs: 33.33,
      freezeCount: 4,
      totalFrames: 120,
      sections: {
        update: {
          count: 120,
          avg: 6.2,
          max: 7.8,
          last: 6.9,
          min: 6.1,
          p95: 7.1,
          p99: 7.8,
        },
      },
      values: {
        "queue.size": { count: 120, avg: 4, max: 5, last: 5, min: 3, p95: 5, p99: 5 },
        "queue.mesh.pending": {
          count: 120,
          avg: 2,
          max: 4,
          last: 1,
          min: 0,
          p95: 4,
          p99: 4,
        },
        "queue.burst.active": {
          count: 120,
          avg: 0.2,
          max: 1,
          last: 1,
          min: 0,
          p95: 1,
          p99: 1,
        },
        "frame.local.p99": {
          count: 120,
          avg: 15.8,
          max: 16.4,
          last: 16.1,
          min: 15.1,
          p95: 16.3,
          p99: 16.4,
        },
      },
    });

    const el = document.getElementById("qf-profiler");
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain("Profiler");
    expect(el?.textContent).toContain("FPS");
    expect(el?.textContent).toContain("min");
    expect(el?.textContent).toContain("queue.mesh.pending");
    expect(el?.textContent).toContain("queue.burst.active");
    expect(el?.textContent).toContain("frame.local.p99");
    expect(el?.textContent).toContain("Slowest Operations");
    expect(el?.textContent).toContain("Operation");
    expect(el?.textContent).toContain("Calls");
    expect(el?.textContent).toContain("Reset Stats");
    expect(document.getElementById("qf-profiler-style")).not.toBeNull();

    overlay.setVisible(false);
    expect(el?.style.display).toBe("none");

    overlay.dispose();
    expect(document.getElementById("qf-profiler")).toBeNull();
    expect(document.getElementById("qf-profiler-style")).toBeNull();
  });
});
