export function buildSparkline(samples: number[], budgetMs: number): string {
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
    <line x1="0" y1="${budgetY.toFixed(1)}" x2="${width}" y2="${budgetY.toFixed(
      1,
    )}" class="qf-profiler__sparkline-budget" />
    <polyline points="${points}" class="qf-profiler__sparkline-line" />
  </svg>
</div>`;
}
