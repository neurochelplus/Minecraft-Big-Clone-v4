export type ProfilerStat = {
  avg: number;
  max: number;
  last: number;
  min: number;
  p95: number;
  p99: number;
};

export type ProfilerStats = {
  fps: number;
  fpsLast: number;
  frame: ProfilerStat;
  sections: Record<string, ProfilerStat>;
  values: Record<string, ProfilerStat>;
  frameSamples: number[];
  sampleSize: number;
  budgetMs: number;
};
