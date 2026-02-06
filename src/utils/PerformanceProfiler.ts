import { FrameProfiler, ProfilerOverlay } from "./Profiler";

const DEFAULT_SAMPLE_SIZE = 120;
const DEFAULT_TARGET_FPS = 60;
const DEFAULT_MAX_SECTIONS = 10;
const DEFAULT_UI_EVERY_FRAMES = 6;
const DEFAULT_UI_MIN_INTERVAL_MS = 80;
const DEFAULT_FULL_UI_EVERY = 3;

export type PerformanceProfilerOptions = {
  uiEveryFrames?: number;
  uiMinIntervalMs?: number;
  fullUiEvery?: number;
};

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function normalizeName(name: string): string {
  return name.trim().replace(/-/g, ".");
}

export class PerformanceProfiler {
  private profiler: FrameProfiler;
  private overlay: ProfilerOverlay;
  private lastFrameAt: number | null = null;
  private visible = false;
  private uiEveryFrames: number;
  private uiMinIntervalMs: number;
  private fullUiEvery: number;
  private uiFrameCounter = 0;
  private uiRenderCounter = 0;
  private lastUiUpdateAt: number | null = null;

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "F3") return;
    event.preventDefault();
    this.toggle();
  };

  constructor(options: PerformanceProfilerOptions = {}) {
    this.uiEveryFrames = Math.max(
      1,
      Math.floor(options.uiEveryFrames ?? DEFAULT_UI_EVERY_FRAMES),
    );
    this.uiMinIntervalMs = Math.max(0, options.uiMinIntervalMs ?? DEFAULT_UI_MIN_INTERVAL_MS);
    this.fullUiEvery = Math.max(1, Math.floor(options.fullUiEvery ?? DEFAULT_FULL_UI_EVERY));

    this.profiler = new FrameProfiler({
      sampleSize: DEFAULT_SAMPLE_SIZE,
      targetFps: DEFAULT_TARGET_FPS,
    });
    this.overlay = new ProfilerOverlay({
      maxSections: DEFAULT_MAX_SECTIONS,
      fullUpdateEvery: this.fullUiEvery,
      onReset: () => this.reset(),
    });
    this.overlay.setVisible(false);
    document.addEventListener("keydown", this.onKeyDown);
  }

  public startMeasure(label: string): void {
    this.profiler.startSection(normalizeName(label), nowMs());
  }

  public endMeasure(label: string): void {
    this.profiler.endSection(normalizeName(label), nowMs());
  }

  public recordValue(name: string, value: number): void {
    this.profiler.recordValue(normalizeName(name), value);
  }

  public updateFrame(): void {
    const now = nowMs();
    if (this.lastFrameAt !== null) {
      this.profiler.startFrame(this.lastFrameAt);
      this.profiler.endFrame(now);
    }
    this.lastFrameAt = now;
    this.flushOverlay(false, now);
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.overlay.setVisible(this.visible);
    if (this.visible) {
      this.resetUiCadence();
      this.flushOverlay(true);
    }
  }

  public reset(): void {
    this.profiler.reset();
    this.lastFrameAt = null;
    this.resetUiCadence();
    if (this.visible) {
      this.flushOverlay(true);
    }
  }

  public dispose(): void {
    document.removeEventListener("keydown", this.onKeyDown);
    this.overlay.dispose();
  }

  private resetUiCadence(): void {
    this.uiFrameCounter = 0;
    this.uiRenderCounter = 0;
    this.lastUiUpdateAt = null;
  }

  private flushOverlay(force: boolean, now: number = nowMs()): void {
    if (!this.visible) return;

    if (!force) {
      this.uiFrameCounter += 1;
      if (this.uiFrameCounter < this.uiEveryFrames) return;

      if (this.lastUiUpdateAt !== null && now - this.lastUiUpdateAt < this.uiMinIntervalMs) {
        return;
      }
    }

    const fullUpdate = force || this.uiRenderCounter % this.fullUiEvery === 0;
    this.overlay.update(this.profiler.getStats(), { full: fullUpdate });
    this.uiRenderCounter += 1;
    this.lastUiUpdateAt = now;
    this.uiFrameCounter = 0;
  }
}

export function createProfiler(): PerformanceProfiler | null {
  if (!import.meta.env.DEV) return null;
  return new PerformanceProfiler();
}

