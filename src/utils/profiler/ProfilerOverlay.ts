import type { ProfilerStats } from "./types";
import {
  DEFAULT_FULL_UPDATE_EVERY,
  DEFAULT_MAX_SECTIONS,
  DEFAULT_MAX_VALUES,
  PROFILER_ROOT_ID,
  type ProfilerOverlayOptions,
} from "./overlay/constants";
import { buildSparkline } from "./overlay/sparkline";
import { createProfilerStyles } from "./overlay/styles";
import {
  clamp,
  formatMs,
  formatNumber,
  pressureClass,
  safeNumber,
} from "./overlay/formatters";
import {
  renderSectionRows,
  renderTopOperationsTable,
  renderValueRows,
} from "./overlay/render";

type OverlayUpdateOptions = {
  full?: boolean;
};

type MetricNodes = {
  root: HTMLDivElement;
  value: HTMLDivElement;
  sub: HTMLDivElement;
};

type OverlayDomNodes = {
  subtitle: HTMLDivElement;
  badge: HTMLDivElement;
  fps: MetricNodes;
  frame: MetricNodes;
  budget: MetricNodes;
  freezes: MetricNodes;
  pressureBar: HTMLDivElement;
  sparkline: HTMLDivElement;
  topOps: HTMLDivElement;
  sections: HTMLDivElement;
  values: HTMLDivElement;
};

export class ProfilerOverlay {
  private root: HTMLDivElement;
  private styleElement: HTMLStyleElement;
  private visible = false;
  private maxSections: number;
  private maxValues: number;
  private fullUpdateEvery: number;
  private onReset?: () => void;

  private subtitleEl: HTMLDivElement;
  private badgeEl: HTMLDivElement;
  private fpsMetric: MetricNodes;
  private frameMetric: MetricNodes;
  private budgetMetric: MetricNodes;
  private freezeMetric: MetricNodes;
  private pressureBarEl: HTMLDivElement;
  private sparklineEl: HTMLDivElement;
  private topOpsEl: HTMLDivElement;
  private sectionsEl: HTMLDivElement;
  private valuesEl: HTMLDivElement;

  private heavyContentReady = false;
  private updateCounter = 0;

  constructor(options: ProfilerOverlayOptions = {}) {
    this.maxSections = options.maxSections ?? DEFAULT_MAX_SECTIONS;
    this.maxValues = options.maxValues ?? DEFAULT_MAX_VALUES;
    this.fullUpdateEvery = Math.max(
      1,
      options.fullUpdateEvery ?? DEFAULT_FULL_UPDATE_EVERY,
    );
    this.onReset = options.onReset;

    this.root = document.createElement("div");
    this.root.id = PROFILER_ROOT_ID;
    this.root.style.position = "fixed";
    this.root.style.left = "12px";
    this.root.style.top = "12px";
    this.root.style.zIndex = "9999";
    this.root.style.display = "none";
    this.root.style.pointerEvents = "auto";
    this.root.style.userSelect = "none";
    this.root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.action !== "reset-profiler") return;
      this.onReset?.();
    });

    this.styleElement = createProfilerStyles();
    const domNodes = this.buildDomTree();
    this.subtitleEl = domNodes.subtitle;
    this.badgeEl = domNodes.badge;
    this.fpsMetric = domNodes.fps;
    this.frameMetric = domNodes.frame;
    this.budgetMetric = domNodes.budget;
    this.freezeMetric = domNodes.freezes;
    this.pressureBarEl = domNodes.pressureBar;
    this.sparklineEl = domNodes.sparkline;
    this.topOpsEl = domNodes.topOps;
    this.sectionsEl = domNodes.sections;
    this.valuesEl = domNodes.values;
    document.body.appendChild(this.root);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.style.display = visible ? "block" : "none";
  }

  public update(stats: ProfilerStats, options: OverlayUpdateOptions = {}): void {
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
    const freezeCount = safeNumber(stats.freezeCount);
    const totalFrames = Math.max(1, safeNumber(stats.totalFrames));
    const freezePct = clamp((freezeCount / totalFrames) * 100, 0, 100);
    const pressure = budgetMs > 0 ? frameAvg / budgetMs : 0;
    const pressurePct = Math.round(clamp(pressure * 100, 0, 200));
    const pressureBar = clamp(pressure * 100, 0, 100);
    const pressureStateClass = pressureClass(pressure);

    this.subtitleEl.textContent = `F3 | samples ${stats.sampleSize}`;
    this.badgeEl.className = `qf-profiler__badge qf-profiler__badge--${pressureStateClass}`;
    this.badgeEl.textContent = `${formatNumber(fpsAvg, 0)} FPS`;

    this.fpsMetric.value.textContent = formatNumber(fpsAvg, 1);
    this.fpsMetric.sub.textContent = `last ${formatNumber(fpsLast, 1)}`;

    this.frameMetric.value.textContent = formatMs(frameAvg);
    this.frameMetric.sub.textContent = `last ${formatMs(frameLast)} | p95 ${formatMs(frameP95)} | p99 ${formatMs(frameP99)}`;

    this.budgetMetric.value.textContent = formatMs(budgetMs);
    this.budgetMetric.sub.textContent = `pressure ${pressurePct}% | min ${formatMs(frameMin)} | max ${formatMs(frameMax)}`;

    this.freezeMetric.value.textContent = formatNumber(freezeCount, 0);
    this.freezeMetric.sub.textContent = `>${formatMs(stats.freezeThresholdMs)} | ${formatNumber(freezePct, 1)}%`;

    this.pressureBarEl.className = `qf-profiler__pressure-bar qf-profiler__pressure-bar--${pressureStateClass}`;
    this.pressureBarEl.style.setProperty("--bar", `${pressureBar.toFixed(1)}%`);
    this.sparklineEl.innerHTML = buildSparkline(stats.frameSamples, budgetMs);

    let shouldFullUpdate: boolean;
    if (options.full === true) {
      shouldFullUpdate = true;
    } else if (options.full === false) {
      shouldFullUpdate = !this.heavyContentReady;
    } else {
      shouldFullUpdate =
        !this.heavyContentReady || this.updateCounter % this.fullUpdateEvery === 0;
    }

    if (shouldFullUpdate) {
      this.topOpsEl.innerHTML = renderTopOperationsTable(stats, this.maxSections);
      this.sectionsEl.innerHTML = renderSectionRows(stats, budgetMs, this.maxSections);
      this.valuesEl.innerHTML = renderValueRows(stats, this.maxValues);
      this.heavyContentReady = true;
    }

    this.updateCounter += 1;
  }

  public dispose(): void {
    this.root.remove();
    this.styleElement.remove();
  }

  private buildDomTree(): OverlayDomNodes {
    const panel = document.createElement("div");
    panel.className = "qf-profiler__panel";
    this.root.appendChild(panel);

    const header = document.createElement("div");
    header.className = "qf-profiler__header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("div");
    title.className = "qf-profiler__title";
    title.textContent = "Profiler";
    const subtitle = document.createElement("div");
    subtitle.className = "qf-profiler__subtitle";
    titleWrap.append(title, subtitle);

    const badge = document.createElement("div");
    badge.className = "qf-profiler__badge";

    header.append(titleWrap, badge);
    panel.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "qf-profiler__grid";
    const fps = this.createMetric("FPS");
    const frame = this.createMetric("Frame");
    const budget = this.createMetric("Budget");
    const freezes = this.createMetric("Freezes");
    grid.append(fps.root, frame.root, budget.root, freezes.root);
    panel.appendChild(grid);

    const pressure = document.createElement("div");
    pressure.className = "qf-profiler__pressure";
    const pressureBar = document.createElement("div");
    pressureBar.className = "qf-profiler__pressure-bar";
    const pressureBarFill = document.createElement("span");
    pressureBar.appendChild(pressureBarFill);
    pressure.appendChild(pressureBar);
    panel.appendChild(pressure);

    const sparkline = document.createElement("div");
    panel.appendChild(sparkline);

    const topOps = document.createElement("div");
    topOps.className = "qf-profiler__sections";
    panel.appendChild(topOps);

    const sections = document.createElement("div");
    sections.className = "qf-profiler__sections";
    panel.appendChild(sections);

    const values = document.createElement("div");
    values.className = "qf-profiler__sections";
    panel.appendChild(values);

    const actions = document.createElement("div");
    actions.className = "qf-profiler__actions";
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.dataset.action = "reset-profiler";
    resetBtn.className = "qf-profiler__button";
    resetBtn.textContent = "Reset Stats";
    actions.appendChild(resetBtn);
    panel.appendChild(actions);

    return {
      subtitle,
      badge,
      fps,
      frame,
      budget,
      freezes,
      pressureBar,
      sparkline,
      topOps,
      sections,
      values,
    };
  }

  private createMetric(labelText: string): MetricNodes {
    const root = document.createElement("div");
    root.className = "qf-profiler__metric";
    const label = document.createElement("div");
    label.className = "qf-profiler__label";
    label.textContent = labelText;
    const value = document.createElement("div");
    value.className = "qf-profiler__value";
    const sub = document.createElement("div");
    sub.className = "qf-profiler__sub";
    root.append(label, value, sub);
    return { root, value, sub };
  }
}
