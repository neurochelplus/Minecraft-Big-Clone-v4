import * as THREE from "three";
import { BLOCK_DEFS, hexToRgb } from "../../constants/BlockTextures";
import {
  TEXTURE_SLOT_COUNT,
  TEXTURE_SLOTS,
  TEXTURE_SLOT_SIZE,
} from "./TextureSlots";

export class TextureAtlas {
  private static readonly ATLAS_WIDTH = TEXTURE_SLOT_COUNT * TEXTURE_SLOT_SIZE;
  private static readonly ATLAS_HEIGHT = TEXTURE_SLOT_SIZE;

  public static createNoiseTexture(): THREE.DataTexture {
    const width = this.ATLAS_WIDTH;
    const height = this.ATLAS_HEIGHT;
    const data = new Uint8Array(width * height * 4);

    for (let i = 0; i < width * height; i++) {
      const stride = i * 4;
      const x = i % width;
      const y = Math.floor(i / width);
      const slot = Math.floor(x / TEXTURE_SLOT_SIZE);
      const localX = x % TEXTURE_SLOT_SIZE;

      this.applySlotTexture(data, stride, slot, localX, y);
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }

  private static setPixel(
    data: Uint8Array,
    stride: number,
    r: number,
    g: number,
    b: number,
    a: number = 255,
  ): void {
    data[stride] = r;
    data[stride + 1] = g;
    data[stride + 2] = b;
    data[stride + 3] = a;
  }

  private static applySlotTexture(
    data: Uint8Array,
    stride: number,
    slot: number,
    localX: number,
    y: number,
  ): void {
    if (slot === TEXTURE_SLOTS.DEFAULT) {
      const v = 150 + Math.floor(Math.random() * 100);
      this.setPixel(data, stride, v, v, v);
      return;
    }

    if (slot === TEXTURE_SLOTS.LEAVES) {
      const base = 95 + Math.floor(Math.random() * 40);
      const alpha = Math.random() < 0.42 ? 0 : 255;
      this.setPixel(data, stride, 40, base, 35, alpha);
      return;
    }

    if (slot === TEXTURE_SLOTS.PLANKS) {
      const grain = 176 + Math.floor(Math.random() * 28);
      let r = grain;
      let g = grain - 35;
      let b = grain - 80;
      if (y % 4 === 0) {
        r = 112;
        g = 78;
        b = 48;
      }
      this.setPixel(data, stride, r, g, b);
      return;
    }

    if (slot >= TEXTURE_SLOTS.CRAFTING_TABLE_TOP && slot <= TEXTURE_SLOTS.CRAFTING_TABLE_BOTTOM) {
      this.applyCraftingTableTexture(data, stride, slot, localX, y);
      return;
    }

    if (slot === TEXTURE_SLOTS.COAL_ORE || slot === TEXTURE_SLOTS.IRON_ORE) {
      this.applyOreTexture(data, stride, slot, localX, y);
      return;
    }

    if (slot >= TEXTURE_SLOTS.FURNACE_FRONT && slot <= TEXTURE_SLOTS.FURNACE_TOP) {
      this.applyFurnaceTexture(data, stride, slot, localX, y);
      return;
    }

    if (slot === TEXTURE_SLOTS.SAND) {
      const base = 214 + Math.floor(Math.random() * 22);
      this.setPixel(data, stride, base + 10, base, base - 40);
      return;
    }

    if (slot === TEXTURE_SLOTS.SANDSTONE) {
      const base = 200 + Math.floor(Math.random() * 20);
      let r = base + 15;
      let g = base;
      let b = base - 35;
      if (y % 4 === 0) {
        r -= 18;
        g -= 15;
        b -= 10;
      }
      this.setPixel(data, stride, r, g, b);
      return;
    }

    if (slot === TEXTURE_SLOTS.SNOW) {
      const tint = 240 + Math.floor(Math.random() * 12);
      this.setPixel(data, stride, tint, Math.min(255, tint + 4), 255);
      return;
    }

    if (slot === TEXTURE_SLOTS.SNOW_GRASS_TOP) {
      const tint = 245 + Math.floor(Math.random() * 10);
      this.setPixel(data, stride, tint, Math.min(255, tint + 4), 255);
      return;
    }

    if (slot === TEXTURE_SLOTS.SNOW_GRASS_SIDE) {
      if (y < 5) {
        const tint = 244 + Math.floor(Math.random() * 10);
        this.setPixel(data, stride, tint, Math.min(255, tint + 3), 255);
      } else {
        const green = 118 + Math.floor(Math.random() * 20);
        this.setPixel(data, stride, 82, green, 64);
      }
      return;
    }

    if (slot === TEXTURE_SLOTS.ICE) {
      const blue = 212 + Math.floor(Math.random() * 28);
      const alpha = 210 + Math.floor(Math.random() * 25);
      this.setPixel(data, stride, 160, 210, blue, alpha);
      return;
    }

    const fallback = 190 + Math.floor(Math.random() * 40);
    this.setPixel(data, stride, fallback, fallback, fallback);
  }

  private static applyCraftingTableTexture(
    data: Uint8Array,
    stride: number,
    slot: number,
    localX: number,
    y: number,
  ): void {
    const isTop = slot === TEXTURE_SLOTS.CRAFTING_TABLE_TOP;
    const isSide = slot === TEXTURE_SLOTS.CRAFTING_TABLE_SIDE;

    if (!isTop && !isSide) {
      const wood = 142 + Math.floor(Math.random() * 24);
      this.setPixel(data, stride, wood, wood - 35, wood - 75);
      return;
    }

    const def = isTop ? BLOCK_DEFS.CRAFTING_TABLE_TOP : BLOCK_DEFS.CRAFTING_TABLE_SIDE;
    if (!def?.pattern || !def.colors) {
      const fallback = 145 + Math.floor(Math.random() * 25);
      this.setPixel(data, stride, fallback, fallback - 35, fallback - 70);
      return;
    }

    const char = def.pattern[y][localX];
    const colorHex = char === "2" ? def.colors.secondary : def.colors.primary;
    const rgb = hexToRgb(colorHex);
    this.setPixel(data, stride, rgb.r, rgb.g, rgb.b);
  }

  private static applyOreTexture(
    data: Uint8Array,
    stride: number,
    slot: number,
    localX: number,
    y: number,
  ): void {
    const def = slot === TEXTURE_SLOTS.COAL_ORE ? BLOCK_DEFS.COAL_ORE : BLOCK_DEFS.IRON_ORE;
    if (!def?.pattern || !def.colors) {
      const v = 140 + Math.floor(Math.random() * 80);
      this.setPixel(data, stride, v, v, v);
      return;
    }

    const char = def.pattern[y][localX];
    if (char === "2") {
      const stone = 115 + Math.floor(Math.random() * 45);
      this.setPixel(data, stride, stone, stone, stone);
      return;
    }

    const rgb = hexToRgb(def.colors.primary);
    this.setPixel(data, stride, rgb.r, rgb.g, rgb.b);
  }

  private static applyFurnaceTexture(
    data: Uint8Array,
    stride: number,
    slot: number,
    localX: number,
    y: number,
  ): void {
    const def =
      slot === TEXTURE_SLOTS.FURNACE_FRONT
        ? BLOCK_DEFS.FURNACE_FRONT
        : slot === TEXTURE_SLOTS.FURNACE_SIDE
          ? BLOCK_DEFS.FURNACE_SIDE
          : BLOCK_DEFS.FURNACE_TOP;

    if (!def?.pattern || !def.colors) {
      const v = 100 + Math.floor(Math.random() * 40);
      this.setPixel(data, stride, v, v, v);
      return;
    }

    const char = def.pattern[y][localX];
    const colorHex = char === "2" ? def.colors.secondary : def.colors.primary;
    const rgb = hexToRgb(colorHex);
    const noise = Math.random() * 0.1 - 0.05;

    const r = Math.min(255, Math.max(0, Math.floor(rgb.r + noise * 255)));
    const g = Math.min(255, Math.max(0, Math.floor(rgb.g + noise * 255)));
    const b = Math.min(255, Math.max(0, Math.floor(rgb.b + noise * 255)));
    this.setPixel(data, stride, r, g, b);
  }

  public static getUVStep(): number {
    return 1 / TEXTURE_SLOT_COUNT;
  }
}
