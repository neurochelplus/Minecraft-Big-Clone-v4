import { describe, expect, it } from "vitest";
import { BLOCK } from "../../constants/Blocks";
import {
  TEXTURE_SLOT_COUNT,
  TEXTURE_SLOTS,
  getBlockTextureSlot,
} from "./TextureSlots";

describe("TextureSlots", () => {
  it("maps new biome blocks to dedicated atlas slots", () => {
    expect(getBlockTextureSlot(BLOCK.SAND, "top")).toBe(TEXTURE_SLOTS.SAND);
    expect(getBlockTextureSlot(BLOCK.SANDSTONE, "front")).toBe(
      TEXTURE_SLOTS.SANDSTONE,
    );
    expect(getBlockTextureSlot(BLOCK.SNOW, "top")).toBe(TEXTURE_SLOTS.SNOW);
    expect(getBlockTextureSlot(BLOCK.SNOW_GRASS, "top")).toBe(
      TEXTURE_SLOTS.SNOW_GRASS_TOP,
    );
    expect(getBlockTextureSlot(BLOCK.SNOW_GRASS, "left")).toBe(
      TEXTURE_SLOTS.SNOW_GRASS_SIDE,
    );
    expect(getBlockTextureSlot(BLOCK.ICE, "right")).toBe(TEXTURE_SLOTS.ICE);
  });

  it("expands atlas slot count for biome blocks", () => {
    expect(TEXTURE_SLOT_COUNT).toBeGreaterThan(12);
  });
});

