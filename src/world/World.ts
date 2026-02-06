import * as THREE from "three";
import { worldDB } from "../utils/DB";
import { BLOCK } from "../constants/Blocks";
import { ChunkManager } from "./chunks/ChunkManager";
import { logger } from "../utils/Logger";
import type { SerializedInventory } from "../types/Inventory";
import { CHUNK_SIZE } from "../constants/GameConstants";
import type { WorldSummary } from "../contracts/world";

type PlayerMeta = {
  position: { x: number; y: number; z: number };
  inventory: SerializedInventory;
  seed: number;
  updatedAt: number;
  schemaVersion: number;
};

type WorldRegistry = WorldSummary[];

type FurnaceWorldAware = {
  setWorldId(worldId: string): void;
};

const WORLDS_INDEX_KEY = "worlds:index";
const WORLDS_ACTIVE_KEY = "worlds:active";
const WORLD_SCHEMA_VERSION = 1;

function randomSeed(): number {
  return Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
}

function clampSeed(seed?: number): number {
  if (typeof seed !== "number" || Number.isNaN(seed)) {
    return randomSeed();
  }

  const normalized = Math.floor(seed);
  if (normalized < 0 || normalized > 0xffffffff) {
    return randomSeed();
  }

  return normalized >>> 0;
}

function nextWorldName(existing: WorldRegistry): string {
  return `World ${existing.length + 1}`;
}

export class World {
  private chunkManager: ChunkManager;
  private activeWorldId: string | null = null;
  private furnaceManager?: FurnaceWorldAware;

  constructor(scene: THREE.Scene, furnaceManager?: FurnaceWorldAware) {
    this.chunkManager = new ChunkManager(scene);
    this.furnaceManager = furnaceManager;
  }

  public get noiseTexture(): THREE.DataTexture {
    return this.chunkManager.getNoiseTexture();
  }

  private getPlayerMetaKey(worldId: string): string {
    return `w:${worldId}:player`;
  }

  private getWorldMetaPrefix(worldId: string): string {
    return `w:${worldId}:`;
  }

  private async readWorldIndex(): Promise<WorldRegistry> {
    await worldDB.init();
    const worlds = await worldDB.get<WorldRegistry>(WORLDS_INDEX_KEY, "meta");
    if (!Array.isArray(worlds)) {
      return [];
    }
    return worlds;
  }

  private async writeWorldIndex(worlds: WorldRegistry): Promise<void> {
    await worldDB.set(WORLDS_INDEX_KEY, worlds, "meta");
  }

  private async updateLastPlayed(worldId: string, timestamp: number): Promise<void> {
    const worlds = await this.readWorldIndex();
    const index = worlds.findIndex((world) => world.id === worldId);
    if (index < 0) {
      return;
    }

    worlds[index] = {
      ...worlds[index],
      lastPlayedAt: timestamp,
    };

    await this.writeWorldIndex(worlds);
  }

  private async findWorldById(worldId: string): Promise<WorldSummary | null> {
    const worlds = await this.readWorldIndex();
    const world = worlds.find((item) => item.id === worldId);
    return world ?? null;
  }

  public async listWorlds(): Promise<WorldSummary[]> {
    const worlds = await this.readWorldIndex();
    return [...worlds].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  }

  public async createWorld(input: { name: string; seed?: number }): Promise<WorldSummary> {
    const worlds = await this.readWorldIndex();
    const now = Date.now();
    const name = input.name.trim() || nextWorldName(worlds);
    const seed = clampSeed(input.seed);

    const world: WorldSummary = {
      id: crypto.randomUUID(),
      name,
      seed,
      createdAt: now,
      lastPlayedAt: now,
    };

    worlds.push(world);
    await this.writeWorldIndex(worlds);

    logger.info(`Created world ${world.id} (${world.name}) seed=${world.seed}`);
    return world;
  }

  public async getActiveWorldId(): Promise<string | null> {
    if (this.activeWorldId !== null) {
      return this.activeWorldId;
    }

    await worldDB.init();
    const active = await worldDB.get<string | null>(WORLDS_ACTIVE_KEY, "meta");
    this.activeWorldId = active ?? null;
    return this.activeWorldId;
  }

  public async setActiveWorld(worldId: string): Promise<void> {
    const world = await this.findWorldById(worldId);
    if (!world) {
      throw new Error(`World ${worldId} not found`);
    }

    if (this.chunkManager.getWorldId() !== world.id) {
      await this.chunkManager.switchWorld(world.id, world.seed);
    } else {
      this.chunkManager.setSeed(world.seed);
    }

    this.furnaceManager?.setWorldId(world.id);

    this.activeWorldId = world.id;
    await worldDB.set(WORLDS_ACTIVE_KEY, world.id, "meta");
    await this.updateLastPlayed(world.id, Date.now());
  }

  public async loadWorld(worldId?: string): Promise<{
    playerPosition?: THREE.Vector3;
    inventory?: SerializedInventory;
    world: WorldSummary;
  }> {
    await worldDB.init();

    const resolvedWorldId = worldId ?? (await this.getActiveWorldId());
    if (!resolvedWorldId) {
      throw new Error("No active world selected");
    }

    await this.setActiveWorld(resolvedWorldId);

    const world = await this.findWorldById(resolvedWorldId);
    if (!world) {
      throw new Error(`World ${resolvedWorldId} not found`);
    }

    const meta = await worldDB.get<PlayerMeta>(
      this.getPlayerMetaKey(resolvedWorldId),
      "meta",
    );

    if (meta?.seed !== undefined) {
      this.chunkManager.setSeed(meta.seed);
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

    await worldDB.set<PlayerMeta>(
      this.getPlayerMetaKey(resolvedWorldId),
      {
        position: {
          x: playerData.position.x,
          y: playerData.position.y,
          z: playerData.position.z,
        },
        inventory: playerData.inventory,
        seed: this.chunkManager.getSeed(),
        updatedAt: Date.now(),
        schemaVersion: WORLD_SCHEMA_VERSION,
      },
      "meta",
    );

    await this.chunkManager.saveDirtyChunks();
    await this.updateLastPlayed(resolvedWorldId, Date.now());
    logger.info(`World ${resolvedWorldId} saved`);
  }

  public async deleteWorld(worldId: string): Promise<void> {
    logger.info(`Deleting world ${worldId}...`);
    await worldDB.init();

    const worlds = await this.readWorldIndex();
    const remainingWorlds = worlds.filter((world) => world.id !== worldId);

    if (remainingWorlds.length === worlds.length) {
      return;
    }

    const metaKeys = await worldDB.keysByPrefix("meta", this.getWorldMetaPrefix(worldId));
    const chunkKeys = await worldDB.keysByPrefix("chunks", `w:${worldId}:c:`);
    const furnaceKeys = await worldDB.keysByPrefix("blockEntities", `w:${worldId}:f:`);

    await worldDB.deleteMany("meta", metaKeys);
    await worldDB.deleteMany("chunks", chunkKeys);
    await worldDB.deleteMany("blockEntities", furnaceKeys);

    await this.writeWorldIndex(remainingWorlds);

    const currentActive = await this.getActiveWorldId();
    if (currentActive === worldId) {
      const nextActive = remainingWorlds[0]?.id ?? null;
      this.activeWorldId = nextActive;
      await worldDB.set(WORLDS_ACTIVE_KEY, nextActive, "meta");
      this.chunkManager.clearInMemory();
      this.furnaceManager?.setWorldId(nextActive ?? "default");
    }

    logger.info(`World ${worldId} deleted`);
  }

  public update(playerPos: THREE.Vector3) {
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
    const centerCx = Math.floor(spawnX / CHUNK_SIZE);
    const centerCz = Math.floor(spawnZ / CHUNK_SIZE);

    const coords: Array<{ cx: number; cz: number; priority: number }> = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const priority = Math.abs(dx) + Math.abs(dz);
        coords.push({ cx, cz, priority });
      }
    }

    coords.sort((a, b) => a.priority - b.priority);

    const total = Math.max(1, coords.length);
    let completed = 0;
    const budgetMs = options?.budgetMs ?? 2.5;
    let frameStart = performance.now();

    for (const item of coords) {
      await this.waitForChunk(item.cx, item.cz);
      completed += 1;
      options?.onProgress?.(completed / total);

      if (budgetMs > 0 && performance.now() - frameStart >= budgetMs) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        frameStart = performance.now();
      }
    }
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

  public getChunkCount(): { visible: number; total: number } {
    return this.chunkManager.getChunkCount();
  }

  public getBreakTime(blockType: number, toolId: number = 0): number {
    let time = 1000;

    switch (blockType) {
      case BLOCK.GRASS:
      case BLOCK.DIRT:
        if (toolId === BLOCK.IRON_SHOVEL) time = 100;
        else if (toolId === BLOCK.STONE_SHOVEL) time = 200;
        else if (toolId === BLOCK.WOODEN_SHOVEL) time = 400;
        else time = 750;
        break;

      case BLOCK.STONE:
      case BLOCK.FURNACE:
        if (toolId === BLOCK.IRON_PICKAXE) time = 400;
        else if (toolId === BLOCK.STONE_PICKAXE) time = 600;
        else if (toolId === BLOCK.WOODEN_PICKAXE) time = 1150;
        else time = 7500;
        break;

      case BLOCK.IRON_ORE:
        if (toolId === BLOCK.IRON_PICKAXE) time = 800;
        else if (toolId === BLOCK.STONE_PICKAXE) time = 1150;
        else if (toolId === BLOCK.WOODEN_PICKAXE) time = 7500;
        else time = 15000;
        break;

      case BLOCK.COAL_ORE:
        if (toolId === BLOCK.IRON_PICKAXE) time = 800;
        else if (toolId === BLOCK.STONE_PICKAXE) time = 1150;
        else if (toolId === BLOCK.WOODEN_PICKAXE) time = 2250;
        else time = 15000;
        break;

      case BLOCK.LEAVES:
        time = 500;
        break;

      case BLOCK.WOOD:
      case BLOCK.PLANKS:
        let multiplier = 1;
        if (
          toolId === BLOCK.WOODEN_AXE ||
          toolId === BLOCK.STONE_AXE ||
          toolId === BLOCK.IRON_AXE
        ) {
          if (toolId === BLOCK.IRON_AXE) multiplier = 8;
          else if (toolId === BLOCK.STONE_AXE) multiplier = 4;
          else multiplier = 2;
        }
        time = 3000 / multiplier;
        break;

      case BLOCK.BEDROCK:
        return Infinity;

      default:
        time = 1000;
        break;
    }

    return time;
  }
}
