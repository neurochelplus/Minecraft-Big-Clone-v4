import type { ProfilerStats } from "../types";
import type { SectionRow, ValueRow } from "./constants";
import { clamp, escapeHtml, formatMs, formatNumber, pressureClass } from "./formatters";

function buildSectionRows(
  stats: ProfilerStats,
  budgetMs: number,
  maxSections: number,
): SectionRow[] {
  const sections = Object.entries(stats.sections)
    .map(([name, section]) => ({
      name,
      stats: section,
      load: budgetMs > 0 ? section.avg / budgetMs : 0,
    }))
    .sort((a, b) => b.stats.avg - a.stats.avg);

  const rows: SectionRow[] = sections.slice(0, maxSections);
  if (sections.length <= maxSections) {
    return rows;
  }

  const rest = sections.slice(maxSections);
  let avg = 0;
  let last = 0;
  let max = 0;
  let min = Infinity;
  let p95 = 0;
  let p99 = 0;
  let count = 0;
  for (const entry of rest) {
    avg += entry.stats.avg;
    last += entry.stats.last;
    count += entry.stats.count;
    if (entry.stats.max > max) max = entry.stats.max;
    if (entry.stats.min < min) min = entry.stats.min;
    if (entry.stats.p95 > p95) p95 = entry.stats.p95;
    if (entry.stats.p99 > p99) p99 = entry.stats.p99;
  }
  rows.push({
    name: "other",
    stats: {
      count,
      avg,
      last,
      max,
      min: Number.isFinite(min) ? min : 0,
      p95,
      p99,
    },
    load: budgetMs > 0 ? avg / budgetMs : 0,
  });
  return rows;
}

export function renderTopOperationsTable(
  stats: ProfilerStats,
  maxSections: number,
): string {
  const rows = Object.entries(stats.sections)
    .map(([name, section]) => ({
      name,
      stats: section,
    }))
    .sort((a, b) => b.stats.avg - a.stats.avg)
    .slice(0, maxSections);

  if (!rows.length) return '<div class="qf-profiler__empty">no operations</div>';

  const body = rows
    .map(
      (entry) => `
      <tr class="qf-profiler__table-row">
        <td class="qf-profiler__table-cell qf-profiler__table-cell--name">${escapeHtml(entry.name)}</td>
        <td class="qf-profiler__table-cell">${formatNumber(entry.stats.avg, 2)}</td>
        <td class="qf-profiler__table-cell">${formatNumber(entry.stats.max, 2)}</td>
        <td class="qf-profiler__table-cell">${formatNumber(entry.stats.count, 0)}</td>
      </tr>`,
    )
    .join("");

  return `
<div class="qf-profiler__group-title">Top ${Math.min(maxSections, rows.length)} Slowest Operations</div>
<table class="qf-profiler__table">
  <thead>
    <tr>
      <th class="qf-profiler__table-head qf-profiler__table-head--name">Operation</th>
      <th class="qf-profiler__table-head">Avg (ms)</th>
      <th class="qf-profiler__table-head">Max (ms)</th>
      <th class="qf-profiler__table-head">Calls</th>
    </tr>
  </thead>
  <tbody>
    ${body}
  </tbody>
</table>`;
}

export function renderSectionRows(
  stats: ProfilerStats,
  budgetMs: number,
  maxSections: number,
): string {
  const rows = buildSectionRows(stats, budgetMs, maxSections);
  if (!rows.length) return '<div class="qf-profiler__empty">no sections</div>';

  const body = rows
    .map((entry) => {
      const barPct = clamp(entry.load * 100, 0, 100);
      const barClass = pressureClass(entry.load);
      return `
<div class="qf-profiler__section">
  <div class="qf-profiler__section-head">
    <div class="qf-profiler__section-name">${escapeHtml(entry.name)}</div>
    <div class="qf-profiler__section-ms">${formatMs(entry.stats.avg)}</div>
  </div>
  <div class="qf-profiler__section-values">
    avg ${formatMs(entry.stats.avg)} | last ${formatMs(entry.stats.last)} | min ${formatMs(
        entry.stats.min,
      )} | p95 ${formatMs(entry.stats.p95)} | p99 ${formatMs(entry.stats.p99)} | max ${formatMs(entry.stats.max)} | calls ${formatNumber(entry.stats.count, 0)}
  </div>
  <div class="qf-profiler__section-bar qf-profiler__section-bar--${barClass}" style="--bar:${barPct.toFixed(
        1,
      )}%;">
    <span></span>
  </div>
</div>`;
    })
    .join("");

  return `
<div class="qf-profiler__group-title">Section Breakdown</div>
${body}`;
}

function buildValueRows(stats: ProfilerStats, maxValues: number): ValueRow[] {
  return Object.entries(stats.values ?? {})
    .map(([name, section]) => ({
      name,
      stats: section,
    }))
    .sort((a, b) => b.stats.avg - a.stats.avg)
    .slice(0, maxValues);
}

export function renderValueRows(stats: ProfilerStats, maxValues: number): string {
  const values = buildValueRows(stats, maxValues);
  if (!values.length) return '<div class="qf-profiler__empty">no metrics</div>';

  const body = values
    .map((entry) => {
      return `
<div class="qf-profiler__section">
  <div class="qf-profiler__section-head">
    <div class="qf-profiler__section-name">${escapeHtml(entry.name)}</div>
    <div class="qf-profiler__section-ms">${formatNumber(entry.stats.avg, 2)}</div>
  </div>
  <div class="qf-profiler__section-values">
    avg ${formatNumber(entry.stats.avg, 2)} | last ${formatNumber(
        entry.stats.last,
        2,
      )} | min ${formatNumber(entry.stats.min, 2)} | p95 ${formatNumber(
        entry.stats.p95,
        2,
      )} | p99 ${formatNumber(entry.stats.p99, 2)} | max ${formatNumber(entry.stats.max, 2)} | calls ${formatNumber(entry.stats.count, 0)}
  </div>
</div>`;
    })
    .join("");

  return `
<div class="qf-profiler__group-title">Top ${Math.min(maxValues, values.length)} Value Metrics</div>
${body}`;
}
