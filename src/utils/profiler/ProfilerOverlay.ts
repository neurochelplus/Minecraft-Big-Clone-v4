import type { ProfilerStats } from "./types";
import {
  DEFAULT_MAX_SECTIONS,
  DEFAULT_MAX_VALUES,
  PROFILER_ROOT_ID,
  type ProfilerOverlayOptions,
} from "./overlay/constants";
import { buildSparkline } from "./overlay/sparkline";
import { createProfilerStyles } from "./overlay/styles";
import { clamp, formatMs, formatNumber, pressureClass, safeNumber } from "./overlay/formatters";
import { renderSectionRows, renderValueRows } from "./overlay/render";

export class ProfilerOverlay {
  private root: HTMLDivElement;
  private styleElement: HTMLStyleElement;
  private visible = false;
  private maxSections: number;
  private maxValues: number;

  constructor(options: ProfilerOverlayOptions = {}) {
    this.maxSections = options.maxSections ?? DEFAULT_MAX_SECTIONS;
    this.maxValues = options.maxValues ?? DEFAULT_MAX_VALUES;
    this.root = document.createElement("div");
    this.root.id = PROFILER_ROOT_ID;
    this.root.style.position = "fixed";
    this.root.style.left = "12px";
    this.root.style.top = "12px";
    this.root.style.zIndex = "9999";
    this.root.style.display = "none";
    this.root.style.pointerEvents = "auto";
    this.root.style.userSelect = "none";
    this.styleElement = createProfilerStyles();
    document.body.appendChild(this.root);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.style.display = visible ? "block" : "none";
  }

  public update(stats: ProfilerStats): void {
    if (!this.visible) return;

    const budgetMs = stats.budgetMs || 16.67;
    const fpsAvg = safeNumber(stats.fps);
    const fpsLast = safeNumber(stats.fpsLast);
    const frameAvg = safeNumber(stats.frame.avg);
    const frameLast = safeNumber(stats.frame.last);
    const frameP95 = safeNumber(stats.frame.p95);
    const frameP99 = safeNumber(stats.frame.p99);
    const frameMax = safeNumber(stats.frame.max);
    const frameMin = safeNumber(stats.frame.min);
    const pressure = budgetMs > 0 ? frameAvg / budgetMs : 0;
    const pressurePct = Math.round(clamp(pressure * 100, 0, 200));
    const pressureBar = clamp(pressure * 100, 0, 100);
    const pressureStateClass = pressureClass(pressure);
    const sectionRows = renderSectionRows(stats, budgetMs, this.maxSections);
    const valueRows = renderValueRows(stats, this.maxValues);
    const sparkline = buildSparkline(stats.frameSamples, budgetMs);

    this.root.innerHTML = `
<div class="qf-profiler__panel">
  <div class="qf-profiler__header">
    <div>
      <div class="qf-profiler__title">Profiler</div>
      <div class="qf-profiler__subtitle">F3 | samples ${stats.sampleSize}</div>
    </div>
    <div class="qf-profiler__badge qf-profiler__badge--${pressureStateClass}">
      ${formatNumber(fpsAvg, 0)} FPS
    </div>
  </div>
  <div class="qf-profiler__grid">
    <div class="qf-profiler__metric">
      <div class="qf-profiler__label">FPS</div>
      <div class="qf-profiler__value">${formatNumber(fpsAvg, 1)}</div>
      <div class="qf-profiler__sub">last ${formatNumber(fpsLast, 1)}</div>
    </div>
    <div class="qf-profiler__metric">
      <div class="qf-profiler__label">Frame</div>
      <div class="qf-profiler__value">${formatMs(frameAvg)}</div>
      <div class="qf-profiler__sub">last ${formatMs(frameLast)} | p95 ${formatMs(
        frameP95,
      )} | p99 ${formatMs(frameP99)}</div>
    </div>
    <div class="qf-profiler__metric">
      <div class="qf-profiler__label">Budget</div>
      <div class="qf-profiler__value">${formatMs(budgetMs)}</div>
      <div class="qf-profiler__sub">pressure ${pressurePct}% | min ${formatMs(
        frameMin,
      )} | max ${formatMs(frameMax)}</div>
    </div>
  </div>
  <div class="qf-profiler__pressure">
    <div class="qf-profiler__pressure-bar qf-profiler__pressure-bar--${pressureStateClass}" style="--bar:${pressureBar.toFixed(
      1,
    )}%;">
      <span></span>
    </div>
  </div>
  ${sparkline}
  <div class="qf-profiler__sections">
    ${sectionRows}
  </div>
  <div class="qf-profiler__sections">
    ${valueRows}
  </div>
</div>`;
  }

  public dispose(): void {
    this.root.remove();
    this.styleElement.remove();
  }
}
