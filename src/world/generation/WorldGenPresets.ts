import type { WorldGenerationProfile } from "../../contracts/world";

export const WORLD_GEN_PRESET_LEGACY = "legacy";
export const WORLD_GEN_PRESET_BIOMES_V3 = "biomes_v3";

export type WorldGenPresetId =
  | typeof WORLD_GEN_PRESET_LEGACY
  | typeof WORLD_GEN_PRESET_BIOMES_V3;

export const WORLD_GEN_PRESET_LABELS: Record<WorldGenPresetId, string> = {
  [WORLD_GEN_PRESET_LEGACY]: "Классический",
  [WORLD_GEN_PRESET_BIOMES_V3]: "Биомы v3",
};

export const WORLD_GEN_VERSION = 2 as const;

export function normalizeWorldGenPresetId(
  presetId?: string,
): WorldGenPresetId {
  if (
    presetId === WORLD_GEN_PRESET_BIOMES_V3 ||
    presetId === "biomes_v1" ||
    presetId === "biomes_v2"
  ) {
    return WORLD_GEN_PRESET_BIOMES_V3;
  }
  return WORLD_GEN_PRESET_LEGACY;
}

export function createWorldGenProfile(
  presetId: string,
): WorldGenerationProfile {
  return {
    presetId: normalizeWorldGenPresetId(presetId),
    generationVersion: WORLD_GEN_VERSION,
  };
}

export function getWorldGenPresetIdFromProfile(
  profile?: WorldGenerationProfile,
): WorldGenPresetId {
  if (!profile) {
    return WORLD_GEN_PRESET_LEGACY;
  }
  return normalizeWorldGenPresetId(profile.presetId);
}

export function getWorldPresetLabel(presetId?: string): string {
  const normalized = normalizeWorldGenPresetId(presetId);
  return WORLD_GEN_PRESET_LABELS[normalized];
}
