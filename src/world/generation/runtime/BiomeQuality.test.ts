import { describe, expect, it } from "vitest";
import { hashSeed } from "../../../utils/Rng";
import { type BiomeId } from "./BiomeRegistry";
import { BiomeSampler, type BiomeWeights } from "./BiomeSampler";
import { getBiomeIdAt } from "./GenerateChunk";
import {
  WORLD_GEN_PRESET_BIOMES_V3,
  type WorldGenPresetId,
} from "../WorldGenPresets";

function topTwo(weights: BiomeWeights): { top: number; second: number } {
  let top = -Infinity;
  let second = -Infinity;

  for (const value of Object.values(weights)) {
    if (value > top) {
      second = top;
      top = value;
    } else if (value > second) {
      second = value;
    }
  }

  return {
    top: Math.max(0, top),
    second: Math.max(0, second),
  };
}

type QualityMetrics = {
  counts: Record<BiomeId, number>;
  totalSamples: number;
  dominantWeightAvg: number;
  top2MarginAvg: number;
  transitionRate: number;
  boundaryDominantAvg: number;
  boundaryMarginAvg: number;
};

function collectQualityMetrics(
  presetId: WorldGenPresetId,
): QualityMetrics {
  const seeds = [1, 42, 777, 123456789];
  const size = 1024;
  const step = 8;
  const width = Math.floor(size / step);
  const height = Math.floor(size / step);

  const counts: Record<BiomeId, number> = {
    plains: 0,
    forest: 0,
    desert: 0,
    mountains: 0,
    tundra: 0,
  };

  let totalSamples = 0;
  let transitions = 0;
  let edges = 0;
  let dominantWeightSum = 0;
  let top2MarginSum = 0;
  let boundaryDominantSum = 0;
  let boundaryMarginSum = 0;
  let boundaryCount = 0;

  for (const seed of seeds) {
    const sampler = new BiomeSampler(hashSeed(seed, "biome"), "v3");
    const grid: BiomeId[][] = Array.from({ length: height }, () => new Array<BiomeId>(width));
    const dominance: number[][] = Array.from({ length: height }, () => new Array<number>(width));
    const margins: number[][] = Array.from({ length: height }, () => new Array<number>(width));

    for (let gz = 0; gz < height; gz++) {
      const z = gz * step;
      for (let gx = 0; gx < width; gx++) {
        const x = gx * step;
        const biome = getBiomeIdAt(seed, presetId, x, z);
        grid[gz][gx] = biome;
        counts[biome]++;
        totalSamples++;

        const sampled = sampler.sample(x, z);
        const { top, second } = topTwo(sampled.weights);
        const margin = top - second;
        dominance[gz][gx] = top;
        margins[gz][gx] = margin;

        dominantWeightSum += top;
        top2MarginSum += margin;
      }
    }

    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        let isBoundary = false;

        if (x + 1 < width) {
          edges++;
          if (grid[z][x] !== grid[z][x + 1]) {
            transitions++;
            isBoundary = true;
          }
        }
        if (z + 1 < height) {
          edges++;
          if (grid[z][x] !== grid[z + 1][x]) {
            transitions++;
            isBoundary = true;
          }
        }
        if (x - 1 >= 0 && grid[z][x] !== grid[z][x - 1]) {
          isBoundary = true;
        }
        if (z - 1 >= 0 && grid[z][x] !== grid[z - 1][x]) {
          isBoundary = true;
        }

        if (isBoundary) {
          boundaryCount++;
          boundaryDominantSum += dominance[z][x];
          boundaryMarginSum += margins[z][x];
        }
      }
    }
  }

  return {
    counts,
    totalSamples,
    dominantWeightAvg: dominantWeightSum / totalSamples,
    top2MarginAvg: top2MarginSum / totalSamples,
    transitionRate: (transitions / edges) * 100,
    boundaryDominantAvg: boundaryDominantSum / Math.max(1, boundaryCount),
    boundaryMarginAvg: boundaryMarginSum / Math.max(1, boundaryCount),
  };
}

describe("BiomeQuality", () => {
  it("keeps transition smoothness and boundary contrast in target ranges for biomes_v3", () => {
    const metrics = collectQualityMetrics(WORLD_GEN_PRESET_BIOMES_V3);

    expect(metrics.transitionRate).toBeGreaterThanOrEqual(8);
    expect(metrics.transitionRate).toBeLessThanOrEqual(12);

    expect(metrics.dominantWeightAvg).toBeGreaterThanOrEqual(0.56);
    expect(metrics.dominantWeightAvg).toBeLessThanOrEqual(0.64);

    expect(metrics.boundaryDominantAvg).toBeGreaterThanOrEqual(0.44);
    expect(metrics.boundaryDominantAvg).toBeLessThanOrEqual(0.55);

    expect(metrics.boundaryMarginAvg).toBeGreaterThanOrEqual(0.12);
    expect(metrics.boundaryMarginAvg).toBeLessThanOrEqual(0.24);
  });
});

