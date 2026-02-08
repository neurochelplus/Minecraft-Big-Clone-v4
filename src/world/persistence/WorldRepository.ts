import type { WorldSummary } from "../../contracts/world";
import { worldDB } from "../../utils/DB";
import type { PlayerMeta, WorldRegistry } from "./types";
import { WORLDS_ACTIVE_KEY, WORLDS_INDEX_KEY } from "./types";

export class WorldRepository {
  private getPlayerMetaKey(worldId: string): string {
    return `w:${worldId}:player`;
  }

  private getWorldMetaPrefix(worldId: string): string {
    return `w:${worldId}:`;
  }

  public async readWorldIndex(): Promise<WorldRegistry> {
    await worldDB.init();
    const worlds = await worldDB.get<WorldRegistry>(WORLDS_INDEX_KEY, "meta");
    if (!Array.isArray(worlds)) {
      return [];
    }
    return worlds;
  }

  public async writeWorldIndex(worlds: WorldRegistry): Promise<void> {
    await worldDB.set(WORLDS_INDEX_KEY, worlds, "meta");
  }

  public async listWorlds(): Promise<WorldSummary[]> {
    const worlds = await this.readWorldIndex();
    return [...worlds].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  }

  public async updateLastPlayed(worldId: string, timestamp: number): Promise<void> {
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

  public async findWorldById(worldId: string): Promise<WorldSummary | null> {
    const worlds = await this.readWorldIndex();
    const world = worlds.find((item) => item.id === worldId);
    return world ?? null;
  }

  public async getActiveWorldId(): Promise<string | null> {
    await worldDB.init();
    const active = await worldDB.get<string | null>(WORLDS_ACTIVE_KEY, "meta");
    return active ?? null;
  }

  public async setActiveWorldId(worldId: string | null): Promise<void> {
    await worldDB.set(WORLDS_ACTIVE_KEY, worldId, "meta");
  }

  public async loadPlayerMeta(worldId: string): Promise<PlayerMeta | undefined> {
    await worldDB.init();
    return worldDB.get<PlayerMeta>(this.getPlayerMetaKey(worldId), "meta");
  }

  public async savePlayerMeta(worldId: string, meta: PlayerMeta): Promise<void> {
    await worldDB.set<PlayerMeta>(this.getPlayerMetaKey(worldId), meta, "meta");
  }

  public async deleteWorldData(worldId: string): Promise<void> {
    await worldDB.init();

    const metaKeys = await worldDB.keysByPrefix("meta", this.getWorldMetaPrefix(worldId));
    const chunkKeys = await worldDB.keysByPrefix("chunks", `w:${worldId}:c:`);
    const furnaceKeys = await worldDB.keysByPrefix("blockEntities", `w:${worldId}:f:`);

    await worldDB.deleteMany("meta", metaKeys);
    await worldDB.deleteMany("chunks", chunkKeys);
    await worldDB.deleteMany("blockEntities", furnaceKeys);
  }
}
