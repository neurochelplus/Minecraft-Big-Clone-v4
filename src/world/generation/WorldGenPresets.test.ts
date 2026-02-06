import { describe, expect, it } from "vitest";
import {
  WORLD_GEN_PRESET_BIOMES_V3,
  WORLD_GEN_PRESET_LEGACY,
  WORLD_GEN_PRESET_LABELS,
  getWorldGenPresetIdFromProfile,
  getWorldPresetLabel,
  normalizeWorldGenPresetId,
} from "./WorldGenPresets";

describe("WorldGenPresets", () => {
  it("maps missing worldGen profile to legacy preset", () => {
    expect(getWorldGenPresetIdFromProfile(undefined)).toBe(WORLD_GEN_PRESET_LEGACY);
    expect(getWorldPresetLabel(undefined)).toBe(
      WORLD_GEN_PRESET_LABELS[WORLD_GEN_PRESET_LEGACY],
    );
  });

  it("normalizes biomes_v1 and biomes_v2 aliases to biomes_v3", () => {
    expect(normalizeWorldGenPresetId("biomes_v1")).toBe(
      WORLD_GEN_PRESET_BIOMES_V3,
    );
    expect(normalizeWorldGenPresetId("biomes_v2")).toBe(
      WORLD_GEN_PRESET_BIOMES_V3,
    );
  });

  it("normalizes biomes_v3 preset", () => {
    expect(normalizeWorldGenPresetId(WORLD_GEN_PRESET_BIOMES_V3)).toBe(
      WORLD_GEN_PRESET_BIOMES_V3,
    );
    expect(getWorldPresetLabel(WORLD_GEN_PRESET_BIOMES_V3)).toBe(
      WORLD_GEN_PRESET_LABELS[WORLD_GEN_PRESET_BIOMES_V3],
    );
  });

  it("falls back unknown preset to legacy", () => {
    expect(normalizeWorldGenPresetId("unknown_preset")).toBe(
      WORLD_GEN_PRESET_LEGACY,
    );
  });
});

