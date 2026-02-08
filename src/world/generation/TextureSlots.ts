import { BLOCK } from "../../constants/Blocks";

export const TEXTURE_SLOTS = {
  DEFAULT: 0,
  LEAVES: 1,
  PLANKS: 2,
  CRAFTING_TABLE_TOP: 3,
  CRAFTING_TABLE_SIDE: 4,
  CRAFTING_TABLE_BOTTOM: 5,
  COAL_ORE: 6,
  IRON_ORE: 7,
  FURNACE_FRONT: 8,
  FURNACE_SIDE: 9,
  FURNACE_TOP: 10,
  SAND: 11,
  SANDSTONE: 12,
  SNOW: 13,
  SNOW_GRASS_TOP: 14,
  SNOW_GRASS_SIDE: 15,
  ICE: 16,
} as const;

export const TEXTURE_SLOT_COUNT = 17;
export const TEXTURE_SLOT_SIZE = 16;
export const TEXTURE_UV_INSET = 0.001;

export type BlockFace = "top" | "bottom" | "front" | "back" | "left" | "right";

export type FurnaceRotationLookup = (
  worldX: number,
  worldY: number,
  worldZ: number,
) => number | undefined;

function resolveFurnaceFrontFace(rotation: number): BlockFace {
  if (rotation === 0) return "back";
  if (rotation === 1) return "right";
  if (rotation === 3) return "left";
  return "front";
}

export function getBlockTextureSlot(
  type: number,
  face: BlockFace,
  context?: {
    worldX?: number;
    worldY?: number;
    worldZ?: number;
    getFurnaceRotation?: FurnaceRotationLookup;
  },
): number {
  if (type === BLOCK.LEAVES) return TEXTURE_SLOTS.LEAVES;
  if (type === BLOCK.PLANKS) return TEXTURE_SLOTS.PLANKS;
  if (type === BLOCK.CRAFTING_TABLE) {
    if (face === "top") return TEXTURE_SLOTS.CRAFTING_TABLE_TOP;
    if (face === "bottom") return TEXTURE_SLOTS.CRAFTING_TABLE_BOTTOM;
    return TEXTURE_SLOTS.CRAFTING_TABLE_SIDE;
  }
  if (type === BLOCK.COAL_ORE) return TEXTURE_SLOTS.COAL_ORE;
  if (type === BLOCK.IRON_ORE) return TEXTURE_SLOTS.IRON_ORE;
  if (type === BLOCK.FURNACE) {
    if (face === "top") return TEXTURE_SLOTS.FURNACE_TOP;
    if (face === "bottom") return TEXTURE_SLOTS.FURNACE_SIDE;

    const worldX = context?.worldX ?? 0;
    const worldY = context?.worldY ?? 0;
    const worldZ = context?.worldZ ?? 0;
    const rotation = context?.getFurnaceRotation?.(worldX, worldY, worldZ) ?? 2;
    const frontFace = resolveFurnaceFrontFace(rotation);
    return face === frontFace
      ? TEXTURE_SLOTS.FURNACE_FRONT
      : TEXTURE_SLOTS.FURNACE_SIDE;
  }
  if (type === BLOCK.SAND) return TEXTURE_SLOTS.SAND;
  if (type === BLOCK.SANDSTONE) return TEXTURE_SLOTS.SANDSTONE;
  if (type === BLOCK.SNOW) return TEXTURE_SLOTS.SNOW;
  if (type === BLOCK.SNOW_GRASS) {
    if (face === "top") return TEXTURE_SLOTS.SNOW_GRASS_TOP;
    if (face === "bottom") return TEXTURE_SLOTS.SNOW_GRASS_SIDE;
    return TEXTURE_SLOTS.SNOW_GRASS_SIDE;
  }
  if (type === BLOCK.ICE) return TEXTURE_SLOTS.ICE;

  return TEXTURE_SLOTS.DEFAULT;
}

export function getUVRangeForSlot(
  slot: number,
  uvStep: number,
): { u0: number; u1: number } {
  return {
    u0: uvStep * slot + TEXTURE_UV_INSET,
    u1: uvStep * (slot + 1) - TEXTURE_UV_INSET,
  };
}

export function getFaceFromBoxGeometryFaceIndex(faceIndex: number): BlockFace {
  // BoxGeometry faces: 0:right 1:left 2:top 3:bottom 4:front 5:back
  if (faceIndex === 0) return "right";
  if (faceIndex === 1) return "left";
  if (faceIndex === 2) return "top";
  if (faceIndex === 3) return "bottom";
  if (faceIndex === 4) return "front";
  return "back";
}
