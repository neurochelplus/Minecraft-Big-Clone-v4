import { describe, expect, it } from "vitest";
import { BLOCK } from "./Blocks";

describe("Block IDs", () => {
  it("keeps biome block IDs below tool range", () => {
    const biomeBlocks = [
      BLOCK.SAND,
      BLOCK.SANDSTONE,
      BLOCK.SNOW,
      BLOCK.SNOW_GRASS,
      BLOCK.ICE,
    ];

    for (const id of biomeBlocks) {
      expect(id).toBeGreaterThanOrEqual(15);
      expect(id).toBeLessThan(20);
    }
  });

  it("keeps tools in 20..39 range", () => {
    const toolIds = [
      BLOCK.WOODEN_SWORD,
      BLOCK.STONE_SWORD,
      BLOCK.WOODEN_PICKAXE,
      BLOCK.STONE_PICKAXE,
      BLOCK.WOODEN_AXE,
      BLOCK.STONE_AXE,
      BLOCK.WOODEN_SHOVEL,
      BLOCK.STONE_SHOVEL,
      BLOCK.BROKEN_COMPASS,
      BLOCK.IRON_SWORD,
      BLOCK.IRON_PICKAXE,
      BLOCK.IRON_AXE,
      BLOCK.IRON_SHOVEL,
    ];

    for (const id of toolIds) {
      expect(id).toBeGreaterThanOrEqual(20);
      expect(id).toBeLessThan(40);
    }
  });
});

