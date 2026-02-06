import type { ProfilerStats, ProfilerStat } from "./types";

type ProfilerOptions = {
  sampleSize?: number;
  targetFps?: number;
  freezeThresholdMs?: number;
};

export class FrameProfiler {
  private sampleSize: number;
  private budgetMs: number;
  private freezeThresholdMs: number;
  private frameStart: number | null = null;
  private frameTimes: number[] = [];
  private totalFrames = 0;
  private sectionStarts = new Map<string, number>();
  private sectionTimes = new Map<string, number[]>();
  private sectionCounts = new Map<string, number>();
  private valueSamples = new Map<string, number[]>();
  private valueCounts = new Map<string, number>();

  constructor(options: ProfilerOptions = {}) {
    this.sampleSize = options.sampleSize ?? 120;
    const targetFps = options.targetFps ?? 60;
    this.budgetMs = targetFps > 0 ? 1000 / targetFps : 16.67;
    this.freezeThresholdMs = options.freezeThresholdMs ?? 33.33;
  }

  public startFrame(now: number): void {
    this.frameStart = now;
  }

  public endFrame(now: number): void {
    if (this.frameStart === null) return;
    this.pushSample(this.frameTimes, now - this.frameStart);
    this.totalFrames += 1;
    this.frameStart = null;
  }

  public startSection(name: string, now: number): void {
    this.sectionStarts.set(name, now);
  }

  public endSection(name: string, now: number): void {
    const start = this.sectionStarts.get(name);
    if (start === undefined) return;
    const duration = now - start;
    const samples = this.sectionTimes.get(name) ?? [];
    this.pushSample(samples, duration);
    this.sectionTimes.set(name, samples);
    this.sectionCounts.set(name, (this.sectionCounts.get(name) ?? 0) + 1);
    this.sectionStarts.delete(name);
  }

  public recordValue(name: string, value: number): void {
    const samples = this.valueSamples.get(name) ?? [];
    this.pushSample(samples, value);
    this.valueSamples.set(name, samples);
    this.valueCounts.set(name, (this.valueCounts.get(name) ?? 0) + 1);
  }

  public reset(): void {
    this.frameStart = null;
    this.frameTimes = [];
    this.totalFrames = 0;
    this.sectionStarts.clear();
    this.sectionTimes.clear();
    this.sectionCounts.clear();
    this.valueSamples.clear();
    this.valueCounts.clear();
  }

  public getStats(): ProfilerStats {
    const frame = this.computeStats(this.frameTimes, this.totalFrames);
    const fps = frame.avg > 0 ? 1000 / frame.avg : 0;
    const fpsLast = frame.last > 0 ? 1000 / frame.last : 0;
    const sections: Record<string, ProfilerStat> = {};
    for (const [name, times] of this.sectionTimes.entries()) {
      sections[name] = this.computeStats(times, this.sectionCounts.get(name) ?? 0);
    }
    const values: Record<string, ProfilerStat> = {};
    for (const [name, list] of this.valueSamples.entries()) {
      values[name] = this.computeStats(list, this.valueCounts.get(name) ?? 0);
    }
    const freezeCount = this.frameTimes.filter((time) => time > this.freezeThresholdMs).length;
    return {
      fps,
      fpsLast,
      frame,
      sections,
      values,
      frameSamples: [...this.frameTimes],
      sampleSize: this.sampleSize,
      budgetMs: this.budgetMs,
      freezeThresholdMs: this.freezeThresholdMs,
      freezeCount,
      totalFrames: this.totalFrames,
    };
  }

  private pushSample(list: number[], value: number): void {
    list.push(value);
    if (list.length > this.sampleSize) {
      list.splice(0, list.length - this.sampleSize);
    }
  }

  private computeStats(list: number[], count: number): ProfilerStat {
    if (list.length === 0) {
      return { count: 0, avg: 0, max: 0, last: 0, min: 0, p95: 0, p99: 0 };
    }
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    for (const value of list) {
      sum += value;
      if (value > max) max = value;
      if (value < min) min = value;
    }
    const sorted = [...list].sort((a, b) => a - b);
    const p95Index = Math.min(
      sorted.length - 1,
      Math.ceil(sorted.length * 0.95) - 1,
    );
    const p95 = sorted[p95Index] ?? sorted[sorted.length - 1];
    const p99Index = Math.min(
      sorted.length - 1,
      Math.ceil(sorted.length * 0.99) - 1,
    );
    const p99 = sorted[p99Index] ?? sorted[sorted.length - 1];
    return {
      count,
      avg: sum / list.length,
      max,
      last: list[list.length - 1],
      min,
      p95,
      p99,
    };
  }
}
