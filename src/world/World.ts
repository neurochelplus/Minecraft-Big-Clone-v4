import * as THREE from "three";
import { ChunkManager } from "./chunks/ChunkManager";
import { logger } from "../utils/Logger";
import type { SerializedInventory } from "../types/Inventory";
import type { WorldSummary } from "../contracts/world";
import type { BiomeId } from "./generation/runtime/BiomeRegistry";
import type { BiomeTint } from "./generation/runtime/BiomeVisuals";
import { getBiomeGrassTint } from "./generation/runtime/BiomeVisuals";
import { getBreakTime } from "./gameplay/breakTime";
import { WorldRepository } from "./persistence/WorldRepository";
import { WORLD_SCHEMA_VERSION } from "./persistence/types";
import { clampSeed, nextWorldName } from "./persistence/worldNaming";
import { preGenerateAround as runPreGenerateAround } from "./runtime/pregeneration";
import { FeatureToggles } from "../utils/FeatureToggles";
import {
  createWorldGenProfile,
  getWorldGenPresetIdFromProfile,
  normalizeWorldGenPresetId,
  WORLD_GEN_PRESET_BIOMES_V3,
  WORLD_GEN_PRESET_LEGACY,
} from "./generation/WorldGenPresets";

type FurnaceWorldAware = {
  setWorldId(worldId: string): void;
};

export class World {
  private chunkManager: ChunkManager;
  private activeWorldId: string | null = null;
  private furnaceManager?: FurnaceWorldAware;
  private repository: WorldRepository;

  constructor(scene: THREE.Scene, furnaceManager?: FurnaceWorldAware) {
    this.chunkManager = new ChunkManager(scene);
    this.furnaceManager = furnaceManager;
    this.repository = new WorldRepository();
  }

  public get noiseTexture(): THREE.DataTexture {
    return this.chunkManager.getNoiseTexture();
  }

  public async listWorlds(): Promise<WorldSummary[]> {
    return this.repository.listWorlds();
  }

  public async createWorld(input: {
    name: string;
    seed?: number;
    worldGenPresetId?: string;
  }): Promise<WorldSummary> {
    const worlds = await this.repository.readWorldIndex();
    const now = Date.now();
    const name = input.name.trim() || nextWorldName(worlds);
    const seed = clampSeed(input.seed);
    const biomesEnabled = FeatureToggles.getInstance().isEnabled("world_biomes_v1");
    const requestedPreset = input.worldGenPresetId
      ? normalizeWorldGenPresetId(input.worldGenPresetId)
      : WORLD_GEN_PRESET_BIOMES_V3;
    const presetId = biomesEnabled ? requestedPreset : WORLD_GEN_PRESET_LEGACY;

    const world: WorldSummary = {
      id: crypto.randomUUID(),
      name,
      seed,
      createdAt: now,
      lastPlayedAt: now,
      worldGen: createWorldGenProfile(presetId),
    };

    worlds.push(world);
    await this.repository.writeWorldIndex(worlds);

    logger.info(
      `Created world ${world.id} (${world.name}) seed=${world.seed} preset=${presetId}`,
    );
    return world;
  }

  public async getActiveWorldId(): Promise<string | null> {
    if (this.activeWorldId !== null) {
      return this.activeWorldId;
    }

    this.activeWorldId = await this.repository.getActiveWorldId();
    return this.activeWorldId;
  }

  public async setActiveWorld(worldId: string): Promise<void> {
    const world = await this.repository.findWorldById(worldId);
    if (!world) {
      throw new Error(`World ${worldId} not found`);
    }

    const presetId = getWorldGenPresetIdFromProfile(world.worldGen);

    if (this.chunkManager.getWorldId() !== world.id) {
      await this.chunkManager.switchWorld(world.id, world.seed, presetId);
    } else {
      this.chunkManager.setGenerationContext(world.seed, presetId);
    }

    this.furnaceManager?.setWorldId(world.id);

    this.activeWorldId = world.id;
    await this.repository.setActiveWorldId(world.id);
    await this.repository.updateLastPlayed(world.id, Date.now());
  }

  public async loadWorld(worldId?: string): Promise<{
    playerPosition?: THREE.Vector3;
    inventory?: SerializedInventory;
    world: WorldSummary;
  }> {
    const resolvedWorldId = worldId ?? (await this.getActiveWorldId());
    if (!resolvedWorldId) {
      throw new Error("No active world selected");
    }

    await this.setActiveWorld(resolvedWorldId);

    const world = await this.repository.findWorldById(resolvedWorldId);
    if (!world) {
      throw new Error(`World ${resolvedWorldId} not found`);
    }

    const meta = await this.repository.loadPlayerMeta(resolvedWorldId);

    if (meta?.seed !== undefined) {
      const worldPresetId = getWorldGenPresetIdFromProfile(world.worldGen);
      this.chunkManager.setGenerationContext(meta.seed, worldPresetId);
      logger.debug(`Loaded seed: ${meta.seed} for world ${resolvedWorldId}`);
    } else {
      logger.debug(
        `No saved player meta for ${resolvedWorldId}, using world seed ${world.seed}`,
      );
    }

    if (!meta) {
      return { world };
    }

    return {
      world,
      playerPosition: new THREE.Vector3(
        meta.position.x,
        meta.position.y,
        meta.position.z,
      ),
      inventory: meta.inventory,
    };
  }

  public async saveWorld(
    playerData: {
      position: THREE.Vector3;
      inventory: SerializedInventory;
    },
    worldId?: string,
  ): Promise<void> {
    const resolvedWorldId = worldId ?? this.activeWorldId;
    if (!resolvedWorldId) {
      throw new Error("Cannot save world: no active world");
    }

    if (this.activeWorldId !== resolvedWorldId) {
      await this.setActiveWorld(resolvedWorldId);
    }

    logger.info(`Saving world ${resolvedWorldId}...`);

    await this.repository.savePlayerMeta(resolvedWorldId, {
      position: {
        x: playerData.position.x,
        y: playerData.position.y,
        z: playerData.position.z,
      },
      inventory: playerData.inventory,
      seed: this.chunkManager.getSeed(),
      updatedAt: Date.now(),
      schemaVersion: WORLD_SCHEMA_VERSION,
    });

    await this.chunkManager.saveDirtyChunks();
    await this.repository.updateLastPlayed(resolvedWorldId, Date.now());
    logger.info(`World ${resolvedWorldId} saved`);
  }

  public async deleteWorld(worldId: string): Promise<void> {
    logger.info(`Deleting world ${worldId}...`);

    const worlds = await this.repository.readWorldIndex();
    const remainingWorlds = worlds.filter((world) => world.id !== worldId);

    if (remainingWorlds.length === worlds.length) {
      return;
    }

    await this.repository.deleteWorldData(worldId);
    await this.repository.writeWorldIndex(remainingWorlds);

    const currentActive = await this.getActiveWorldId();
    if (currentActive === worldId) {
      const nextActive = remainingWorlds[0]?.id ?? null;
      this.activeWorldId = nextActive;
      await this.repository.setActiveWorldId(nextActive);
      this.chunkManager.clearInMemory();
      this.furnaceManager?.setWorldId(nextActive ?? "default");
    }

    logger.info(`World ${worldId} deleted`);
  }

  public update(
    playerPos: THREE.Vector3,
    _viewDir?: THREE.Vector3,
    _profiler?: unknown,
  ) {
    this.chunkManager.update(playerPos);
  }

  public updateChunkVisibility(camera: THREE.Camera) {
    this.chunkManager.updateVisibility(camera);
  }

  public async loadChunk(cx: number, cz: number) {
    await this.chunkManager.loadChunk(cx, cz);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    await this.chunkManager.waitForChunk(cx, cz);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    return this.chunkManager.isChunkLoaded(x, z);
  }

  public async preGenerateAround(
    spawnX: number,
    spawnZ: number,
    radius: number,
    options?: { budgetMs?: number; onProgress?: (progress: number) => void },
  ): Promise<void> {
    await runPreGenerateAround(
      async (cx: number, cz: number) => this.waitForChunk(cx, cz),
      spawnX,
      spawnZ,
      radius,
      options,
    );
  }

  public getBlock(x: number, y: number, z: number): number {
    return this.chunkManager.getBlock(x, y, z);
  }

  public setBlock(x: number, y: number, z: number, type: number) {
    this.chunkManager.setBlock(x, y, z, type);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    return this.chunkManager.hasBlock(x, y, z);
  }

  public getTopY(worldX: number, worldZ: number): number {
    return this.chunkManager.getTopY(worldX, worldZ);
  }

  public getBiomeAt(worldX: number, worldZ: number): BiomeId {
    return this.chunkManager.getBiomeAt(worldX, worldZ);
  }

  public getBiomeTintAt(worldX: number, worldZ: number): BiomeTint {
    return getBiomeGrassTint(this.getBiomeAt(worldX, worldZ));
  }

  public getChunkCount(): { visible: number; total: number } {
    return this.chunkManager.getChunkCount();
  }

  public getBreakTime(blockType: number, toolId: number = 0): number {
    return getBreakTime(blockType, toolId);
  }
}
