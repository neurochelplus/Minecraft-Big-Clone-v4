import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { FeatureToggles } from "../utils/FeatureToggles";
import { World } from "./World";
import {
  WORLD_GEN_PRESET_BIOMES_V3,
  WORLD_GEN_PRESET_LEGACY,
} from "./generation/WorldGenPresets";

describe("World.createWorld", () => {
  it("maps biomes_v1 alias to biomes_v3 when feature flag is enabled", async () => {
    const world = new World(new THREE.Scene());
    const toggles = FeatureToggles.getInstance() as unknown as {
      config: Map<string, boolean>;
    };
    const previous = toggles.config.get("world_biomes_v1");
    toggles.config.set("world_biomes_v1", true);

    const writes: unknown[] = [];
    (world as unknown as { repository: unknown }).repository = {
      readWorldIndex: async () => [],
      writeWorldIndex: async (payload: unknown) => {
        writes.push(payload);
      },
    };

    const created = await world.createWorld({
      name: "Biome Alias v1 Test",
      seed: 123,
      worldGenPresetId: "biomes_v1",
    });

    expect(created.worldGen?.presetId).toBe(WORLD_GEN_PRESET_BIOMES_V3);
    expect(created.worldGen?.generationVersion).toBe(2);
    expect(writes.length).toBe(1);
    if (previous !== undefined) {
      toggles.config.set("world_biomes_v1", previous);
    }
  });

  it("maps biomes_v2 alias to biomes_v3 when feature flag is enabled", async () => {
    const world = new World(new THREE.Scene());
    const toggles = FeatureToggles.getInstance() as unknown as {
      config: Map<string, boolean>;
    };
    const previous = toggles.config.get("world_biomes_v1");
    toggles.config.set("world_biomes_v1", true);

    (world as unknown as { repository: unknown }).repository = {
      readWorldIndex: async () => [],
      writeWorldIndex: async () => undefined,
    };

    const created = await world.createWorld({
      name: "Biome Alias v2 Test",
      seed: 321,
      worldGenPresetId: "biomes_v2",
    });

    expect(created.worldGen?.presetId).toBe(WORLD_GEN_PRESET_BIOMES_V3);
    if (previous !== undefined) {
      toggles.config.set("world_biomes_v1", previous);
    }
  });

  it("defaults to biomes_v3 when preset is omitted and feature flag is enabled", async () => {
    const world = new World(new THREE.Scene());
    const toggles = FeatureToggles.getInstance() as unknown as {
      config: Map<string, boolean>;
    };
    const previous = toggles.config.get("world_biomes_v1");
    toggles.config.set("world_biomes_v1", true);

    (world as unknown as { repository: unknown }).repository = {
      readWorldIndex: async () => [],
      writeWorldIndex: async () => undefined,
    };

    const created = await world.createWorld({
      name: "Biome V3 Default Test",
      seed: 555,
    });

    expect(created.worldGen?.presetId).toBe(WORLD_GEN_PRESET_BIOMES_V3);
    if (previous !== undefined) {
      toggles.config.set("world_biomes_v1", previous);
    }
  });

  it("falls back to legacy preset when feature flag is disabled", async () => {
    const world = new World(new THREE.Scene());
    const toggles = FeatureToggles.getInstance() as unknown as {
      config: Map<string, boolean>;
    };
    const previous = toggles.config.get("world_biomes_v1");
    toggles.config.set("world_biomes_v1", false);

    (world as unknown as { repository: unknown }).repository = {
      readWorldIndex: async () => [],
      writeWorldIndex: async () => undefined,
    };

    const created = await world.createWorld({
      name: "Legacy Test",
      seed: 123,
      worldGenPresetId: "biomes_v2",
    });

    expect(created.worldGen?.presetId).toBe(WORLD_GEN_PRESET_LEGACY);
    if (previous !== undefined) {
      toggles.config.set("world_biomes_v1", previous);
    }
  });
});

