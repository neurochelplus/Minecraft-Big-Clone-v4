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
  });
});

describe("ProfilerOverlay", () => {
  it("creates and updates DOM overlay", () => {
    const overlay = new ProfilerOverlay();

    overlay.setVisible(true);
    overlay.update({
      fps: 60,
      fpsLast: 58,
      frame: { avg: 16.67, max: 18.2, last: 16.4, min: 15.9, p95: 18 },
      frameSamples: [15.5, 16.2, 17.8, 16.4],
      sampleSize: 120,
      budgetMs: 16.67,
      sections: {
        update: { avg: 6.2, max: 7.8, last: 6.9, min: 6.1, p95: 7.1 },
      },
    });

    const el = document.getElementById("qf-profiler");
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain("Profiler");
    expect(el?.textContent).toContain("FPS");
    expect(el?.textContent).toContain("min");
    expect(document.getElementById("qf-profiler-style")).not.toBeNull();

    overlay.setVisible(false);
    expect(el?.style.display).toBe("none");

    overlay.dispose();
    expect(document.getElementById("qf-profiler")).toBeNull();
    expect(document.getElementById("qf-profiler-style")).toBeNull();
  });
});
