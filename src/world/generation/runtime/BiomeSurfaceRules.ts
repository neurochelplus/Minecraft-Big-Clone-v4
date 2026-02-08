import { BLOCK } from "../../../constants/Blocks";
import {
  WORLD_GEN_PRESET_BIOMES_V3,
  type WorldGenPresetId,
} from "../WorldGenPresets";
import {
  BIOME_REGISTRY,
  getBiomeDefinitionForProfile,
  type BiomeId,
} from "./BiomeRegistry";
import type { ClimateSample } from "./BiomeSampler";

export type SurfaceContext = {
  presetId: WorldGenPresetId;
  biomeId: BiomeId;
  secondBiomeId?: BiomeId;
  ecotone?: number;
  climate: ClimateSample;
  surfaceY: number;
  depthFromSurface: number;
  slope?: number;
  mountainInfluence?: number;
};

function isSnowBiome(biomeId: BiomeId): boolean {
  return biomeId === "mountains" || biomeId === "tundra";
}

function resolveSurfaceBlockLegacyBiomes(context: SurfaceContext): number {
  const {
    biomeId,
    climate,
    surfaceY,
    depthFromSurface,
    slope = 0,
    mountainInfluence = 0,
  } = context;
  const biome = BIOME_REGISTRY[biomeId];
  const highOrCold = surfaceY >= 30 || climate.temperature < 0.23;

  const shouldUseRockFace =
    depthFromSurface <= 2 &&
    (slope >= 3 || (mountainInfluence >= 0.3 && slope >= 2));

  if (shouldUseRockFace) {
    if (highOrCold) {
      return BLOCK.SNOW;
    }
    if (biomeId === "desert") {
      return BLOCK.SANDSTONE;
    }
    return BLOCK.STONE;
  }

  if (depthFromSurface === 0) {
    if (biomeId === "mountains" && (surfaceY >= 30 || climate.temperature < 0.25)) {
      return BLOCK.SNOW;
    }
    return biome.surface.top;
  }

  if (biomeId === "tundra" && depthFromSurface === 1 && climate.moisture > 0.55) {
    return BLOCK.ICE;
  }

  if (
    biomeId === "mountains" &&
    depthFromSurface <= 1 &&
    (surfaceY >= 30 || climate.temperature < 0.2)
  ) {
    return BLOCK.SNOW;
  }

  if (depthFromSurface <= 4) {
    return biome.surface.filler;
  }

  return BLOCK.STONE;
}

function resolveSurfaceBlockV3(context: SurfaceContext): number {
  const {
    biomeId,
    secondBiomeId = biomeId,
    ecotone = 0,
    climate,
    surfaceY,
    depthFromSurface,
    slope = 0,
    mountainInfluence = 0,
  } = context;
  const biome = getBiomeDefinitionForProfile("v3", biomeId);
  const highOrCold = surfaceY >= 30 || climate.temperature < 0.23;

  const shouldUseRockFace =
    slope >= 4 || (mountainInfluence >= 0.55 && slope >= 3);

  if (shouldUseRockFace) {
    if (isSnowBiome(biomeId) && depthFromSurface <= 1 && highOrCold) {
      return BLOCK.SNOW;
    }

    // In non-snow biomes only the top layer becomes rock on steep boundaries.
    if (!isSnowBiome(biomeId) && depthFromSurface === 0) {
      if (biomeId === "desert") {
        return BLOCK.SANDSTONE;
      }
      return BLOCK.STONE;
    }
  }

  if (ecotone >= 0.45 && secondBiomeId !== biomeId) {
    const hasDesertPair =
      (biomeId === "desert" && (secondBiomeId === "plains" || secondBiomeId === "forest")) ||
      (secondBiomeId === "desert" && (biomeId === "plains" || biomeId === "forest"));

    if (hasDesertPair) {
      if (depthFromSurface === 0) {
        return climate.moisture < 0.44 ? BLOCK.SAND : BLOCK.GRASS;
      }
      if (depthFromSurface <= 2) {
        return climate.moisture < 0.44 ? BLOCK.SANDSTONE : BLOCK.DIRT;
      }
    }

    const hasMountainPair = biomeId === "mountains" || secondBiomeId === "mountains";
    if (hasMountainPair && depthFromSurface <= 1) {
      if (isSnowBiome(biomeId) && highOrCold) {
        return BLOCK.SNOW;
      }
      return BLOCK.STONE;
    }

    const hasTundraPair = biomeId === "tundra" || secondBiomeId === "tundra";
    const hasTemperatePair =
      biomeId === "plains" ||
      biomeId === "forest" ||
      secondBiomeId === "plains" ||
      secondBiomeId === "forest";

    if (hasTundraPair && hasTemperatePair) {
      if (depthFromSurface === 0) {
        return climate.temperature < 0.28 ? BLOCK.SNOW_GRASS : BLOCK.GRASS;
      }
      if (
        depthFromSurface === 1 &&
        climate.moisture > 0.58 &&
        climate.temperature < 0.26
      ) {
        return BLOCK.ICE;
      }
    }
  }

  if (depthFromSurface === 0) {
    if (biomeId === "mountains" && (surfaceY >= 30 || climate.temperature < 0.25)) {
      return BLOCK.SNOW;
    }
    return biome.surface.top;
  }

  if (biomeId === "tundra" && depthFromSurface === 1 && climate.moisture > 0.55) {
    return BLOCK.ICE;
  }

  if (
    biomeId === "mountains" &&
    depthFromSurface <= 1 &&
    (surfaceY >= 30 || climate.temperature < 0.2)
  ) {
    return BLOCK.SNOW;
  }

  if (depthFromSurface <= 4) {
    return biome.surface.filler;
  }

  return BLOCK.STONE;
}

export function resolveSurfaceBlock(context: SurfaceContext): number {
  if (context.presetId === WORLD_GEN_PRESET_BIOMES_V3) {
    return resolveSurfaceBlockV3(context);
  }
  return resolveSurfaceBlockLegacyBiomes(context);
}
