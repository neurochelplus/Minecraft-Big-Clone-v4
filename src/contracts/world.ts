import type { DataTexture } from "three";
import type { InventorySlot } from "./inventory";

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type NoiseTexture = DataTexture;

export interface IWorldRead {
  readonly noiseTexture: NoiseTexture;
  getBlock(x: number, y: number, z: number): number;
  hasBlock(x: number, y: number, z: number): boolean;
  getTopY(worldX: number, worldZ: number): number;
  isChunkLoaded(x: number, z: number): boolean;
  waitForChunk(cx: number, cz: number): Promise<void>;
}

export interface IWorldWrite {
  setBlock(x: number, y: number, z: number, type: number): void;
}

export interface IWorldRuntime {
  update(playerPos: Vec3): void;
  loadChunk(cx: number, cz: number): Promise<void>;
}

export interface IWorldPersistence {
  loadWorld(): Promise<{
    playerPosition?: Vec3;
    inventory?: InventorySlot[];
  }>;
  saveWorld(playerData: { position: Vec3; inventory: InventorySlot[] }): Promise<void>;
  deleteWorld(): Promise<void>;
}

export interface IWorld
  extends IWorldRead,
    IWorldWrite,
    IWorldRuntime,
    IWorldPersistence {
  getBreakTime(blockType: number, toolId?: number): number;
}
