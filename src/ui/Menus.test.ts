/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import { Menus } from "./Menus";
import type { Game } from "../core/Game";
import { FeatureToggles } from "../utils/FeatureToggles";
import {
  WORLD_GEN_PRESET_BIOMES_V3,
  WORLD_GEN_PRESET_LEGACY,
} from "../world/generation/WorldGenPresets";

function setupDom(): void {
  document.body.innerHTML = `
    <div id="main-menu" style="display:flex"></div>
    <div id="singleplayer-menu"></div>
    <div id="pause-menu"></div>
    <div id="settings-menu"></div>
    <div id="inventory-menu"></div>
    <div id="ui-container"></div>
    <div id="mobile-ui"></div>
    <video id="bg-video"></video>
    <div id="crosshair"></div>
    <div id="world-list"></div>
    <div id="world-empty-hint"></div>
    <div id="create-world-dialog" style="display:none"></div>
    <input id="create-world-name" />
    <input id="create-world-seed" />
    <select id="create-world-preset">
      <option value="legacy">Legacy</option>
      <option value="biomes_v3">Biomes v3</option>
    </select>

    <button id="btn-new-game"></button>
    <button id="btn-play-world"></button>
    <button id="btn-create-world"></button>
    <button id="btn-delete-world"></button>
    <button id="btn-back-singleplayer"></button>
    <button id="btn-multiplayer"></button>
    <button id="btn-resume"></button>
    <button id="btn-exit"></button>
    <button id="btn-settings-main"></button>
    <button id="btn-settings-pause"></button>
    <button id="btn-back-settings"></button>
    <button id="btn-create-world-confirm"></button>
    <button id="btn-create-world-cancel"></button>

    <input id="cb-shadows" type="checkbox" />
    <input id="cb-clouds" type="checkbox" />
  `;
}

function createGameStub(): unknown {
  return {
    environment: {
      setShadowsEnabled: () => {},
      setCloudsEnabled: () => {},
    },
    renderer: {
      getIsMobile: () => false,
      controls: {
        lock: () => {},
      },
    },
    gameState: {
      setIsResuming: () => {},
      getGameStarted: () => false,
    },
    saveCoordinator: null,
    world: {
      listWorlds: async () => [],
      getActiveWorldId: async () => null,
      setActiveWorld: async () => {},
      createWorld: async () => ({ id: "w", name: "w", seed: 1 }),
      deleteWorld: async () => {},
    },
  };
}

class AudioStub {
  public loop = false;
  public volume = 1;
  public paused = true;
  public currentTime = 0;
  public play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }
  public pause(): void {
    this.paused = true;
  }
}

beforeEach(() => {
  setupDom();
  (globalThis as unknown as { Audio: typeof Audio }).Audio =
    AudioStub as unknown as typeof Audio;
});

describe("Menus create-world preset defaults", () => {
  it("selects biomes_v3 when biome presets are enabled", () => {
    const toggles = FeatureToggles.getInstance() as unknown as {
      config: Map<string, boolean>;
    };
    const previous = toggles.config.get("world_biomes_v1");
    toggles.config.set("world_biomes_v1", true);

    new Menus(createGameStub() as unknown as Game);

    const createButton = document.getElementById("btn-create-world") as HTMLButtonElement;
    createButton.click();

    const preset = document.getElementById("create-world-preset") as HTMLSelectElement;
    const v3 = preset.querySelector(`option[value="${WORLD_GEN_PRESET_BIOMES_V3}"]`) as HTMLOptionElement;

    expect(preset.value).toBe(WORLD_GEN_PRESET_BIOMES_V3);
    expect(v3.disabled).toBe(false);

    if (previous !== undefined) {
      toggles.config.set("world_biomes_v1", previous);
    }
  });

  it("falls back to legacy when biome presets are disabled", () => {
    const toggles = FeatureToggles.getInstance() as unknown as {
      config: Map<string, boolean>;
    };
    const previous = toggles.config.get("world_biomes_v1");
    toggles.config.set("world_biomes_v1", false);

    new Menus(createGameStub() as unknown as Game);

    const createButton = document.getElementById("btn-create-world") as HTMLButtonElement;
    createButton.click();

    const preset = document.getElementById("create-world-preset") as HTMLSelectElement;
    const v3 = preset.querySelector(`option[value="${WORLD_GEN_PRESET_BIOMES_V3}"]`) as HTMLOptionElement;

    expect(preset.value).toBe(WORLD_GEN_PRESET_LEGACY);
    expect(v3.disabled).toBe(true);

    if (previous !== undefined) {
      toggles.config.set("world_biomes_v1", previous);
    }
  });
});

