import { BIOME_REGISTRY, type BiomeId } from "./BiomeRegistry";

export type BiomeStructureRules = {
  treeChance: number;
  oreMultiplier: number;
};

/**
 * @deprecated Runtime generation should read BIOME_REGISTRY[biomeId] directly.
 * Kept only for legacy generator compatibility.
 */
export function getBiomeStructureRules(biomeId: BiomeId): BiomeStructureRules {
  const biome = BIOME_REGISTRY[biomeId];
  return {
    treeChance: biome.treeChance,
    oreMultiplier: biome.oreMultiplier,
  };
}
