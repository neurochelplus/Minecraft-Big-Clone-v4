import type { DataTexture } from "three";
import type { InventorySlot } from "./inventory";
import type { ProfilerHook } from "./profiler";
import type { BiomeId } from "../world/generation/runtime/BiomeRegistry";
import type { BiomeTint } from "../world/generation/runtime/BiomeVisuals";

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type NoiseTexture = DataTexture;

export type WorldGenerationProfile = {
  presetId: string;
  generationVersion: 2;
};

export type WorldSummary = {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  lastPlayedAt: number;
  worldGen?: WorldGenerationProfile;
};

export interface IWorldRead {
  readonly noiseTexture: NoiseTexture;
  getBlock(x: number, y: number, z: number): number;
  hasBlock(x: number, y: number, z: number): boolean;
  getTopY(worldX: number, worldZ: number): number;
  getBiomeAt(worldX: number, worldZ: number): BiomeId;
  getBiomeTintAt?(worldX: number, worldZ: number): BiomeTint;
  isChunkLoaded(x: number, z: number): boolean;
  waitForChunk(cx: number, cz: number): Promise<void>;
}

export interface IWorldWrite {
  setBlock(x: number, y: number, z: number, type: number): void;
}

export interface IWorldRuntime {
  update(playerPos: Vec3, viewDir?: Vec3, profiler?: ProfilerHook): void;
  loadChunk(cx: number, cz: number): Promise<void>;
  preGenerateAround(
    spawnX: number,
    spawnZ: number,
    radius: number,
    options?: { budgetMs?: number; onProgress?: (progress: number) => void },
  ): Promise<void>;
}

export interface IWorldPersistence {
  listWorlds(): Promise<WorldSummary[]>;
  createWorld(input: {
    name: string;
    seed?: number;
    worldGenPresetId?: string;
  }): Promise<WorldSummary>;
  setActiveWorld(worldId: string): Promise<void>;
  getActiveWorldId(): Promise<string | null>;
  loadWorld(worldId?: string): Promise<{
    playerPosition?: Vec3;
    inventory?: InventorySlot[];
    world: WorldSummary;
  }>;
  saveWorld(
    playerData: { position: Vec3; inventory: InventorySlot[] },
    worldId?: string,
  ): Promise<void>;
  deleteWorld(worldId: string): Promise<void>;
}

export interface IWorld
  extends IWorldRead,
    IWorldWrite,
    IWorldRuntime,
    IWorldPersistence {
  getBreakTime(blockType: number, toolId?: number): number;
}
