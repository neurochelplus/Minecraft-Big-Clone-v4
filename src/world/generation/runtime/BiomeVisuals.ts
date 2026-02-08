import { BLOCK } from "../../../constants/Blocks";
import type { BiomeId } from "./BiomeRegistry";

export type BiomeTint = {
  r: number;
  g: number;
  b: number;
};

type BiomeVisualPalette = {
  grass: BiomeTint;
  leaves: BiomeTint;
  snowGrass: BiomeTint;
};

const BIOME_VISUALS: Record<BiomeId, BiomeVisualPalette> = {
  plains: {
    grass: { r: 1.0, g: 1.0, b: 1.0 },
    leaves: { r: 1.0, g: 1.0, b: 1.0 },
    snowGrass: { r: 1.0, g: 1.0, b: 1.0 },
  },
  forest: {
    grass: { r: 0.9, g: 1.08, b: 0.9 },
    leaves: { r: 0.88, g: 1.12, b: 0.88 },
    snowGrass: { r: 0.95, g: 1.02, b: 0.95 },
  },
  desert: {
    grass: { r: 1.08, g: 1.0, b: 0.86 },
    leaves: { r: 1.06, g: 1.0, b: 0.9 },
    snowGrass: { r: 1.03, g: 1.0, b: 0.92 },
  },
  mountains: {
    grass: { r: 0.92, g: 0.97, b: 1.02 },
    leaves: { r: 0.9, g: 0.96, b: 1.02 },
    snowGrass: { r: 0.95, g: 0.99, b: 1.03 },
  },
  tundra: {
    grass: { r: 0.86, g: 0.94, b: 1.08 },
    leaves: { r: 0.82, g: 0.9, b: 1.08 },
    snowGrass: { r: 0.93, g: 0.98, b: 1.05 },
  },
};

const NEUTRAL_TINT: BiomeTint = { r: 1, g: 1, b: 1 };

export function getBiomeGrassTint(biomeId: BiomeId): BiomeTint {
  return BIOME_VISUALS[biomeId]?.grass ?? NEUTRAL_TINT;
}

export function getBiomeTintForBlock(
  biomeId: BiomeId,
  blockType: number,
): BiomeTint | null {
  const visuals = BIOME_VISUALS[biomeId];
  if (!visuals) {
    return null;
  }

  if (blockType === BLOCK.GRASS) {
    return visuals.grass;
  }
  if (blockType === BLOCK.LEAVES) {
    return visuals.leaves;
  }
  if (blockType === BLOCK.SNOW_GRASS) {
    return visuals.snowGrass;
  }

  return null;
}
