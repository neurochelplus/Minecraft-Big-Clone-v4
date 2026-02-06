import { FrameProfiler, ProfilerOverlay } from "./Profiler";

const DEFAULT_SAMPLE_SIZE = 120;
const DEFAULT_TARGET_FPS = 60;
const DEFAULT_MAX_SECTIONS = 16;

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

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "F3") return;
    event.preventDefault();
    this.toggle();
  };

  constructor() {
    this.profiler = new FrameProfiler({
      sampleSize: DEFAULT_SAMPLE_SIZE,
      targetFps: DEFAULT_TARGET_FPS,
    });
    this.overlay = new ProfilerOverlay({ maxSections: DEFAULT_MAX_SECTIONS });
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
    if (this.visible) {
      this.overlay.update(this.profiler.getStats());
    }
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.overlay.setVisible(this.visible);
    if (this.visible) {
      this.overlay.update(this.profiler.getStats());
    }
  }

  public reset(): void {
    this.profiler = new FrameProfiler({
      sampleSize: DEFAULT_SAMPLE_SIZE,
      targetFps: DEFAULT_TARGET_FPS,
    });
    this.lastFrameAt = null;
    if (this.visible) {
      this.overlay.update(this.profiler.getStats());
    }
  }

  public dispose(): void {
    document.removeEventListener("keydown", this.onKeyDown);
    this.overlay.dispose();
  }
}

export function createProfiler(): PerformanceProfiler | null {
  if (!import.meta.env.DEV) return null;
  return new PerformanceProfiler();
}

