export type ProfilerStat = {
  avg: number;
  max: number;
  last: number;
  min: number;
  p95: number;
};

export type ProfilerStats = {
  fps: number;
  fpsLast: number;
  frame: ProfilerStat;
  sections: Record<string, ProfilerStat>;
  frameSamples: number[];
  sampleSize: number;
  budgetMs: number;
};

type ProfilerOptions = {
  sampleSize?: number;
  targetFps?: number;
};

type ProfilerOverlayOptions = {
  maxSections?: number;
};

export class FrameProfiler {
  private sampleSize: number;
  private budgetMs: number;
  private frameStart: number | null = null;
  private frameTimes: number[] = [];
  private sectionStarts = new Map<string, number>();
  private sectionTimes = new Map<string, number[]>();

  constructor(options: ProfilerOptions = {}) {
    this.sampleSize = options.sampleSize ?? 120;
    const targetFps = options.targetFps ?? 60;
    this.budgetMs = targetFps > 0 ? 1000 / targetFps : 16.67;
  }

  public startFrame(now: number): void {
    this.frameStart = now;
  }

  public endFrame(now: number): void {
    if (this.frameStart === null) return;
    this.pushSample(this.frameTimes, now - this.frameStart);
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
    this.sectionStarts.delete(name);
  }

  public getStats(): ProfilerStats {
    const frame = this.computeStats(this.frameTimes);
    const fps = frame.avg > 0 ? 1000 / frame.avg : 0;
    const fpsLast = frame.last > 0 ? 1000 / frame.last : 0;
    const sections: Record<string, ProfilerStat> = {};
    for (const [name, times] of this.sectionTimes.entries()) {
      sections[name] = this.computeStats(times);
    }
    return {
      fps,
      fpsLast,
      frame,
      sections,
      frameSamples: [...this.frameTimes],
      sampleSize: this.sampleSize,
      budgetMs: this.budgetMs,
    };
  }

  private pushSample(list: number[], value: number): void {
    list.push(value);
    if (list.length > this.sampleSize) {
      list.splice(0, list.length - this.sampleSize);
    }
  }

  private computeStats(list: number[]): ProfilerStat {
    if (list.length === 0) {
      return { avg: 0, max: 0, last: 0, min: 0, p95: 0 };
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
    return {
      avg: sum / list.length,
      max,
      last: list[list.length - 1],
      min,
      p95,
    };
  }
}

export class ProfilerOverlay {
  private root: HTMLDivElement;
  private styleElement: HTMLStyleElement;
  private visible = false;
  private maxSections: number;

  constructor(options: ProfilerOverlayOptions = {}) {
    this.maxSections = options.maxSections ?? 8;
    this.root = document.createElement("div");
    this.root.id = "qf-profiler";
    this.root.style.position = "fixed";
    this.root.style.left = "12px";
    this.root.style.top = "12px";
    this.root.style.zIndex = "9999";
    this.root.style.display = "none";
    this.root.style.pointerEvents = "auto";
    this.root.style.userSelect = "none";
    this.styleElement = this.createStyles();
    document.body.appendChild(this.root);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.style.display = visible ? "block" : "none";
  }

  public update(stats: ProfilerStats): void {
    if (!this.visible) return;

    const budgetMs = stats.budgetMs || 16.67;
    const fpsAvg = this.safeNumber(stats.fps);
    const fpsLast = this.safeNumber(stats.fpsLast);
    const frameAvg = this.safeNumber(stats.frame.avg);
    const frameLast = this.safeNumber(stats.frame.last);
    const frameP95 = this.safeNumber(stats.frame.p95);
    const frameMax = this.safeNumber(stats.frame.max);
    const frameMin = this.safeNumber(stats.frame.min);
    const pressure = budgetMs > 0 ? frameAvg / budgetMs : 0;
    const pressurePct = Math.round(this.clamp(pressure * 100, 0, 200));
    const pressureBar = this.clamp(pressure * 100, 0, 100);
    const pressureClass = this.pressureClass(pressure);

    const sections = Object.entries(stats.sections)
      .map(([name, section]) => ({
        name,
        stats: section,
        load: budgetMs > 0 ? section.avg / budgetMs : 0,
      }))
      .sort((a, b) => b.stats.avg - a.stats.avg);

    const rows: Array<{
      name: string;
      stats: ProfilerStat;
      load: number;
    }> = sections.slice(0, this.maxSections);
    if (sections.length > this.maxSections) {
      const rest = sections.slice(this.maxSections);
      let avg = 0;
      let last = 0;
      let max = 0;
      let min = Infinity;
      let p95 = 0;
      for (const entry of rest) {
        avg += entry.stats.avg;
        last += entry.stats.last;
        if (entry.stats.max > max) max = entry.stats.max;
        if (entry.stats.min < min) min = entry.stats.min;
        if (entry.stats.p95 > p95) p95 = entry.stats.p95;
      }
      rows.push({
        name: "other",
        stats: {
          avg,
          last,
          max,
          min: Number.isFinite(min) ? min : 0,
          p95,
        },
        load: budgetMs > 0 ? avg / budgetMs : 0,
      });
    }

    const sectionRows = rows
      .map((entry) => {
        const barPct = this.clamp(entry.load * 100, 0, 100);
        const barClass = this.pressureClass(entry.load);
        return `
<div class="qf-profiler__section">
  <div class="qf-profiler__section-head">
    <div class="qf-profiler__section-name">${this.escapeHtml(entry.name)}</div>
    <div class="qf-profiler__section-ms">${this.formatMs(entry.stats.avg)}</div>
  </div>
  <div class="qf-profiler__section-values">
    avg ${this.formatMs(entry.stats.avg)} | last ${this.formatMs(entry.stats.last)} | min ${this.formatMs(entry.stats.min)} | p95 ${this.formatMs(entry.stats.p95)} | max ${this.formatMs(entry.stats.max)}
  </div>
  <div class="qf-profiler__section-bar qf-profiler__section-bar--${barClass}" style="--bar:${barPct.toFixed(1)}%;">
    <span></span>
  </div>
</div>`;
      })
      .join("");

    const sparkline = this.buildSparkline(stats.frameSamples, budgetMs);

    this.root.innerHTML = `
<div class="qf-profiler__panel">
  <div class="qf-profiler__header">
    <div>
      <div class="qf-profiler__title">Profiler</div>
      <div class="qf-profiler__subtitle">F3 | samples ${stats.sampleSize}</div>
    </div>
    <div class="qf-profiler__badge qf-profiler__badge--${pressureClass}">
      ${this.formatNumber(fpsAvg, 0)} FPS
    </div>
  </div>
  <div class="qf-profiler__grid">
    <div class="qf-profiler__metric">
      <div class="qf-profiler__label">FPS</div>
      <div class="qf-profiler__value">${this.formatNumber(fpsAvg, 1)}</div>
      <div class="qf-profiler__sub">last ${this.formatNumber(fpsLast, 1)}</div>
    </div>
    <div class="qf-profiler__metric">
      <div class="qf-profiler__label">Frame</div>
      <div class="qf-profiler__value">${this.formatMs(frameAvg)}</div>
      <div class="qf-profiler__sub">last ${this.formatMs(frameLast)} | p95 ${this.formatMs(frameP95)}</div>
    </div>
    <div class="qf-profiler__metric">
      <div class="qf-profiler__label">Budget</div>
      <div class="qf-profiler__value">${this.formatMs(budgetMs)}</div>
      <div class="qf-profiler__sub">pressure ${pressurePct}% | min ${this.formatMs(frameMin)} | max ${this.formatMs(frameMax)}</div>
    </div>
  </div>
  <div class="qf-profiler__pressure">
    <div class="qf-profiler__pressure-bar qf-profiler__pressure-bar--${pressureClass}" style="--bar:${pressureBar.toFixed(1)}%;">
      <span></span>
    </div>
  </div>
  ${sparkline}
  <div class="qf-profiler__sections">
    ${sectionRows || '<div class="qf-profiler__empty">no sections</div>'}
  </div>
</div>`;
  }

  public dispose(): void {
    this.root.remove();
    this.styleElement.remove();
  }

  private createStyles(): HTMLStyleElement {
    const style = document.createElement("style");
    style.id = "qf-profiler-style";
    style.textContent = `
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600&display=swap");

#qf-profiler {
  color: #e7f4f2;
  font-family: "Space Grotesk", "Segoe UI", system-ui, sans-serif;
}

#qf-profiler .qf-profiler__panel {
  width: 340px;
  max-height: calc(100vh - 24px);
  background: linear-gradient(180deg, rgba(14, 20, 24, 0.9), rgba(6, 10, 12, 0.92));
  border: 1px solid rgba(150, 220, 215, 0.2);
  border-radius: 14px;
  padding: 12px 12px 10px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10px) saturate(140%);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

#qf-profiler .qf-profiler__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

#qf-profiler .qf-profiler__title {
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #98e6dd;
}

#qf-profiler .qf-profiler__subtitle {
  font-size: 11px;
  color: rgba(231, 244, 242, 0.6);
  margin-top: 2px;
}

#qf-profiler .qf-profiler__badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(20, 30, 32, 0.6);
}

#qf-profiler .qf-profiler__badge--good {
  color: #7bf1c8;
  border-color: rgba(123, 241, 200, 0.4);
}

#qf-profiler .qf-profiler__badge--warn {
  color: #f7c25c;
  border-color: rgba(247, 194, 92, 0.4);
}

#qf-profiler .qf-profiler__badge--bad {
  color: #ff8b8b;
  border-color: rgba(255, 139, 139, 0.4);
}

#qf-profiler .qf-profiler__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

#qf-profiler .qf-profiler__metric {
  padding: 8px;
  border-radius: 10px;
  background: rgba(12, 18, 20, 0.75);
  border: 1px solid rgba(100, 160, 160, 0.2);
}

#qf-profiler .qf-profiler__label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(231, 244, 242, 0.6);
}

#qf-profiler .qf-profiler__value {
  font-size: 16px;
  font-weight: 600;
  color: #f0fffd;
  margin-top: 4px;
}

#qf-profiler .qf-profiler__sub {
  font-size: 11px;
  color: rgba(231, 244, 242, 0.7);
  margin-top: 3px;
}

#qf-profiler .qf-profiler__pressure {
  margin: 10px 0 8px;
}

#qf-profiler .qf-profiler__pressure-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(90, 130, 130, 0.25);
  overflow: hidden;
}

#qf-profiler .qf-profiler__pressure-bar span {
  display: block;
  height: 100%;
  width: var(--bar, 0%);
  transition: width 0.2s ease;
  background: linear-gradient(90deg, rgba(111, 231, 202, 0.9), rgba(38, 210, 197, 0.9));
}

#qf-profiler .qf-profiler__pressure-bar--warn span {
  background: linear-gradient(90deg, rgba(247, 194, 92, 0.95), rgba(244, 155, 80, 0.95));
}

#qf-profiler .qf-profiler__pressure-bar--bad span {
  background: linear-gradient(90deg, rgba(255, 139, 139, 0.95), rgba(255, 95, 95, 0.95));
}

#qf-profiler .qf-profiler__sparkline {
  height: 46px;
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid rgba(90, 150, 150, 0.2);
  background: rgba(10, 16, 18, 0.8);
}

#qf-profiler .qf-profiler__sparkline svg {
  width: 100%;
  height: 100%;
}

#qf-profiler .qf-profiler__sparkline-line {
  stroke: #6fe7d8;
  stroke-width: 1.6;
  fill: none;
}

#qf-profiler .qf-profiler__sparkline-budget {
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

#qf-profiler .qf-profiler__sections {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  min-height: 0;
}

#qf-profiler .qf-profiler__section {
  padding: 8px;
  border-radius: 10px;
  background: rgba(10, 16, 18, 0.8);
  border: 1px solid rgba(90, 150, 150, 0.18);
}

#qf-profiler .qf-profiler__section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

#qf-profiler .qf-profiler__section-name {
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  color: #c8fff4;
}

#qf-profiler .qf-profiler__section-ms {
  font-size: 12px;
  color: rgba(231, 244, 242, 0.7);
}

#qf-profiler .qf-profiler__section-values {
  font-size: 10px;
  color: rgba(231, 244, 242, 0.6);
  margin-bottom: 6px;
}

#qf-profiler .qf-profiler__section-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(90, 130, 130, 0.25);
  overflow: hidden;
}

#qf-profiler .qf-profiler__section-bar span {
  display: block;
  height: 100%;
  width: var(--bar, 0%);
  transition: width 0.2s ease;
  background: linear-gradient(90deg, rgba(111, 231, 202, 0.9), rgba(38, 210, 197, 0.9));
}

#qf-profiler .qf-profiler__section-bar--warn span {
  background: linear-gradient(90deg, rgba(247, 194, 92, 0.95), rgba(244, 155, 80, 0.95));
}

#qf-profiler .qf-profiler__section-bar--bad span {
  background: linear-gradient(90deg, rgba(255, 139, 139, 0.95), rgba(255, 95, 95, 0.95));
}

#qf-profiler .qf-profiler__empty {
  padding: 8px;
  border-radius: 8px;
  text-align: center;
  font-size: 11px;
  color: rgba(231, 244, 242, 0.6);
  border: 1px dashed rgba(90, 150, 150, 0.25);
}

@media (max-width: 720px) {
  #qf-profiler .qf-profiler__panel {
    width: 260px;
  }
  #qf-profiler .qf-profiler__grid {
    grid-template-columns: 1fr;
  }
}
`;
    document.head.appendChild(style);
    return style;
  }

  private buildSparkline(samples: number[], budgetMs: number): string {
    if (!samples.length) {
      return '<div class="qf-profiler__sparkline"><div class="qf-profiler__empty">no data</div></div>';
    }
    const width = 240;
    const height = 40;
    const maxSample = Math.max(budgetMs, ...samples, 1);
    const step = width / Math.max(1, samples.length - 1);
    const points = samples
      .map((value, index) => {
        const x = index * step;
        const y = height - (value / maxSample) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    const budgetY = height - (budgetMs / maxSample) * height;
    return `
<div class="qf-profiler__sparkline">
  <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    <line x1="0" y1="${budgetY.toFixed(1)}" x2="${width}" y2="${budgetY.toFixed(1)}" class="qf-profiler__sparkline-budget" />
    <polyline points="${points}" class="qf-profiler__sparkline-line" />
  </svg>
</div>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private pressureClass(ratio: number): "good" | "warn" | "bad" {
    if (ratio >= 1.05) return "bad";
    if (ratio >= 0.9) return "warn";
    return "good";
  }

  private safeNumber(value: number): number {
    return Number.isFinite(value) ? value : 0;
  }

  private formatNumber(value: number, digits: number): string {
    return this.safeNumber(value).toFixed(digits);
  }

  private formatMs(value: number): string {
    return `${this.formatNumber(value, 2)} ms`;
  }
}
