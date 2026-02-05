type Stat = {
  count: number;
  totalMs: number;
  maxMs: number;
};

export class GenProfiler {
  private static enabled: boolean | null = null;
  private static stats: Map<string, Stat> = new Map();
  private static chunkCount = 0;
  private static readonly REPORT_EVERY = 20;

  private static isEnabled(): boolean {
    if (this.enabled !== null) return this.enabled;
    if (typeof window === "undefined") {
      this.enabled = false;
      return this.enabled;
    }
    try {
      this.enabled = localStorage.getItem("qf-gen-prof") === "1";
    } catch {
      this.enabled = false;
    }
    return this.enabled;
  }

  public static start(_label: string): number {
    if (!this.isEnabled()) return 0;
    return performance.now();
  }

  public static end(label: string, startTime: number): void {
    if (!this.isEnabled()) return;
    const duration = performance.now() - startTime;
    const stat = this.stats.get(label) ?? { count: 0, totalMs: 0, maxMs: 0 };
    stat.count += 1;
    stat.totalMs += duration;
    if (duration > stat.maxMs) stat.maxMs = duration;
    this.stats.set(label, stat);

    if (label === "chunk.total") {
      this.chunkCount += 1;
      if (this.chunkCount % this.REPORT_EVERY === 0) {
        this.report();
      }
    }
  }

  public static report(): void {
    if (!this.isEnabled()) return;
    const rows: Array<{ label: string; avg: number; max: number; count: number }> = [];
    for (const [label, stat] of this.stats.entries()) {
      rows.push({
        label,
        avg: stat.totalMs / Math.max(1, stat.count),
        max: stat.maxMs,
        count: stat.count,
      });
    }
    rows.sort((a, b) => b.avg - a.avg);
    console.table(rows);
  }
}
