import type { SerializedInventory } from "../../types/Inventory";
import type { WorldSummary } from "../../contracts/world";

export type PlayerMeta = {
  position: { x: number; y: number; z: number };
  inventory: SerializedInventory;
  seed: number;
  updatedAt: number;
  schemaVersion: number;
};

export type WorldRegistry = WorldSummary[];

export const WORLDS_INDEX_KEY = "worlds:index";
export const WORLDS_ACTIVE_KEY = "worlds:active";
export const WORLD_SCHEMA_VERSION = 1;
