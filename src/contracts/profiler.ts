export type ProfilerHook = {
  startSection(name: string, now: number): void;
  endSection(name: string, now: number): void;
  recordValue?(name: string, value: number): void;
};
