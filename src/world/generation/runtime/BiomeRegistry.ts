import { BLOCK } from "../../../constants/Blocks";

export type BiomeId =
  | "plains"
  | "forest"
  | "desert"
  | "mountains"
  | "tundra";

export type BiomeSurface = {
  top: number;
  filler: number;
};

export type BiomeDefinition = {
  id: BiomeId;
  // Preferred climate center for smooth blending.
  temperature: number;
  moisture: number;
  heightOffset: number;
  roughness: number;
  surface: BiomeSurface;
  treeChance: number;
  oreMultiplier: number;
};

export type BiomeGenerationProfile = "default" | "v3";

const PLAINS: BiomeDefinition = {
  id: "plains",
  temperature: 0.55,
  moisture: 0.45,
  heightOffset: 0.0,
  roughness: 1.0,
  surface: { top: BLOCK.GRASS, filler: BLOCK.DIRT },
  treeChance: 0.008,
  oreMultiplier: 1.0,
};

const FOREST: BiomeDefinition = {
  id: "forest",
  temperature: 0.5,
  moisture: 0.72,
  heightOffset: 1.2,
  roughness: 1.15,
  surface: { top: BLOCK.GRASS, filler: BLOCK.DIRT },
  treeChance: 0.02,
  oreMultiplier: 1.0,
};

const DESERT: BiomeDefinition = {
  id: "desert",
  temperature: 0.9,
  moisture: 0.18,
  heightOffset: 0.4,
  roughness: 0.9,
  surface: { top: BLOCK.SAND, filler: BLOCK.SANDSTONE },
  treeChance: 0,
  oreMultiplier: 0.9,
};

const MOUNTAINS: BiomeDefinition = {
  id: "mountains",
  temperature: 0.35,
  moisture: 0.42,
  heightOffset: 7.5,
  roughness: 1.9,
  surface: { top: BLOCK.STONE, filler: BLOCK.STONE },
  treeChance: 0.002,
  oreMultiplier: 1.2,
};

const TUNDRA: BiomeDefinition = {
  id: "tundra",
  temperature: 0.1,
  moisture: 0.35,
  heightOffset: 0.8,
  roughness: 1.2,
  surface: { top: BLOCK.SNOW_GRASS, filler: BLOCK.SNOW },
  treeChance: 0.001,
  oreMultiplier: 1.05,
};

const V3_PLAINS: BiomeDefinition = {
  id: "plains",
  temperature: 0.57,
  moisture: 0.43,
  heightOffset: -1.2,
  roughness: 0.7,
  surface: { top: BLOCK.GRASS, filler: BLOCK.DIRT },
  treeChance: 0.0038,
  oreMultiplier: 0.98,
};

const V3_FOREST: BiomeDefinition = {
  id: "forest",
  temperature: 0.48,
  moisture: 0.75,
  heightOffset: 3.4,
  roughness: 1.62,
  surface: { top: BLOCK.GRASS, filler: BLOCK.DIRT },
  treeChance: 0.028,
  oreMultiplier: 1.02,
};

const V3_DESERT: BiomeDefinition = {
  id: "desert",
  temperature: 0.93,
  moisture: 0.14,
  heightOffset: -0.1,
  roughness: 0.74,
  surface: { top: BLOCK.SAND, filler: BLOCK.SANDSTONE },
  treeChance: 0,
  oreMultiplier: 0.88,
};

const V3_MOUNTAINS: BiomeDefinition = {
  id: "mountains",
  temperature: 0.32,
  moisture: 0.4,
  heightOffset: 8.8,
  roughness: 2.2,
  surface: { top: BLOCK.STONE, filler: BLOCK.STONE },
  treeChance: 0.0012,
  oreMultiplier: 1.22,
};

const V3_TUNDRA: BiomeDefinition = {
  id: "tundra",
  temperature: 0.08,
  moisture: 0.31,
  heightOffset: 1.1,
  roughness: 1.35,
  surface: { top: BLOCK.SNOW_GRASS, filler: BLOCK.SNOW },
  treeChance: 0.0008,
  oreMultiplier: 1.08,
};

export const BIOME_REGISTRY: Record<BiomeId, BiomeDefinition> = {
  plains: PLAINS,
  forest: FOREST,
  desert: DESERT,
  mountains: MOUNTAINS,
  tundra: TUNDRA,
};

export const BIOME_LIST: readonly BiomeDefinition[] = [
  PLAINS,
  FOREST,
  DESERT,
  MOUNTAINS,
  TUNDRA,
];

export const BIOME_REGISTRY_V3: Record<BiomeId, BiomeDefinition> = {
  plains: V3_PLAINS,
  forest: V3_FOREST,
  desert: V3_DESERT,
  mountains: V3_MOUNTAINS,
  tundra: V3_TUNDRA,
};

export const BIOME_LIST_V3: readonly BiomeDefinition[] = [
  V3_PLAINS,
  V3_FOREST,
  V3_DESERT,
  V3_MOUNTAINS,
  V3_TUNDRA,
];

export function getBiomeRegistryForProfile(
  profile: BiomeGenerationProfile = "default",
): Record<BiomeId, BiomeDefinition> {
  return profile === "v3" ? BIOME_REGISTRY_V3 : BIOME_REGISTRY;
}

export function getBiomeListForProfile(
  profile: BiomeGenerationProfile = "default",
): readonly BiomeDefinition[] {
  return profile === "v3" ? BIOME_LIST_V3 : BIOME_LIST;
}

export function getBiomeDefinitionForProfile(
  profile: BiomeGenerationProfile,
  biomeId: BiomeId,
): BiomeDefinition {
  return getBiomeRegistryForProfile(profile)[biomeId];
}
