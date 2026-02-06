import { describe, expect, it } from "vitest";
import { BLOCK } from "../../../constants/Blocks";
import { WORLD_GEN_PRESET_BIOMES_V3 } from "../WorldGenPresets";
import { resolveSurfaceBlock } from "./BiomeSurfaceRules";

describe("BiomeSurfaceRules", () => {
  it("uses registry top and filler for desert", () => {
    const top = resolveSurfaceBlock({
      presetId: WORLD_GEN_PRESET_BIOMES_V3,
      biomeId: "desert",
      climate: { temperature: 0.9, moisture: 0.1, continentalness: 0.4, ruggedness: 0.2 },
      surfaceY: 24,
      depthFromSurface: 0,
    });
    const filler = resolveSurfaceBlock({
      presetId: WORLD_GEN_PRESET_BIOMES_V3,
      biomeId: "desert",
      climate: { temperature: 0.9, moisture: 0.1, continentalness: 0.4, ruggedness: 0.2 },
      surfaceY: 24,
      depthFromSurface: 2,
    });

    expect(top).toBe(BLOCK.SAND);
    expect(filler).toBe(BLOCK.SANDSTONE);
  });

  it("applies tundra climate override for ice", () => {
    const next = resolveSurfaceBlock({
      presetId: WORLD_GEN_PRESET_BIOMES_V3,
      biomeId: "tundra",
      climate: { temperature: 0.12, moisture: 0.6, continentalness: 0.4, ruggedness: 0.3 },
      surfaceY: 22,
      depthFromSurface: 1,
    });

    expect(next).toBe(BLOCK.ICE);
  });

  it("keeps mountain snow override at high/cold surfaces", () => {
    const top = resolveSurfaceBlock({
      presetId: WORLD_GEN_PRESET_BIOMES_V3,
      biomeId: "mountains",
      climate: { temperature: 0.2, moisture: 0.4, continentalness: 0.7, ruggedness: 0.8 },
      surfaceY: 32,
      depthFromSurface: 0,
    });

    expect(top).toBe(BLOCK.SNOW);
  });

  it("uses rock face on steep mountain-adjacent boundary", () => {
    const top = resolveSurfaceBlock({
      presetId: WORLD_GEN_PRESET_BIOMES_V3,
      biomeId: "plains",
      climate: { temperature: 0.5, moisture: 0.5, continentalness: 0.5, ruggedness: 0.5 },
      surfaceY: 26,
      depthFromSurface: 0,
      slope: 4,
      mountainInfluence: 0.55,
    });

    expect(top).toBe(BLOCK.STONE);
  });

  it("does not leak snow on steep non-snow biome in v3", () => {
    const top = resolveSurfaceBlock({
      presetId: WORLD_GEN_PRESET_BIOMES_V3,
      biomeId: "plains",
      secondBiomeId: "mountains",
      ecotone: 0.6,
      climate: { temperature: 0.45, moisture: 0.5, continentalness: 0.72, ruggedness: 0.78 },
      surfaceY: 34,
      depthFromSurface: 0,
      slope: 4,
      mountainInfluence: 0.5,
    });

    expect(top).toBe(BLOCK.STONE);
  });
});

