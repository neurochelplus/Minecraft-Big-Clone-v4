import type { ProfilerStat } from "../types";

export const PROFILER_ROOT_ID = "qf-profiler";
export const PROFILER_STYLE_ID = "qf-profiler-style";
export const DEFAULT_MAX_SECTIONS = 10;
export const DEFAULT_MAX_VALUES = 8;

export type ProfilerOverlayOptions = {
  maxSections?: number;
  maxValues?: number;
  onReset?: () => void;
};

export type SectionRow = {
  name: string;
  stats: ProfilerStat;
  load: number;
};

export type ValueRow = {
  name: string;
  stats: ProfilerStat;
};
