import { describe, expect, it } from "vitest";
import { BiomeSampler } from "./BiomeSampler";

describe("BiomeSampler", () => {
  it("returns deterministic biome and climate for v3 by default", () => {
    const sampler = new BiomeSampler(123456);
    const first = sampler.sample(128, -96);
    const second = sampler.sample(128, -96);

    expect(first.biomeId).toBe(second.biomeId);
    expect(first.secondBiomeId).toBe(second.secondBiomeId);
    expect(first.climate.temperature).toBeCloseTo(second.climate.temperature, 8);
    expect(first.climate.moisture).toBeCloseTo(second.climate.moisture, 8);
    expect(first.weights).toEqual(second.weights);
  });

  it("keeps biome weights normalized", () => {
    const sampler = new BiomeSampler(999, "v3");
    const sample = sampler.sample(2048, -2048);
    const total =
      sample.weights.plains +
      sample.weights.forest +
      sample.weights.desert +
      sample.weights.mountains +
      sample.weights.tundra;

    expect(total).toBeCloseTo(1, 6);
  });
});

