import { getSurfaceSpawnPosition } from "../../utils/SpawnUtils";
import { getPerfProfile, getPerfProfileName } from "../../world/perf/PerfProfile";
import { getStartupPregenBudgetMs, getStartupPregenRadius } from "./pregen";
import type { StartGameOptions } from "./types";

export async function startGameFlow(options: StartGameOptions): Promise<void> {
  const { game, loadSave, dom, menuMusic, worldLoading } = options;

  game.gameState.setPaused(true);
  game.gameState.setGameStarted(false);

  dom.mainMenu.style.display = "none";
  dom.pauseMenu.style.display = "none";
  dom.settingsMenu.style.display = "none";
  dom.inventoryMenu.style.display = "none";
  dom.uiContainer.style.display = "none";
  dom.bgVideo.style.display = "none";
  dom.crosshair.style.display = "none";

  menuMusic.pause();
  menuMusic.currentTime = 0;

  if (!game.renderer.getIsMobile()) {
    if (game.renderer.controls.isLocked !== true) {
      document.body.focus();
      game.renderer.controls.lock();
    }
  }

  if (dom.mobileUi) {
    dom.mobileUi.style.display = "none";
  }

  worldLoading.startManual();
  worldLoading.setProgress(0.02);

  if (!loadSave) {
    await game.world.deleteWorld();
  }

  const data = await game.world.loadWorld();
  worldLoading.setProgress(0.2);

  const spawnX = data.playerPosition?.x ?? game.renderer.controls.object.position.x;
  const spawnZ = data.playerPosition?.z ?? game.renderer.controls.object.position.z;

  if (data.inventory) {
    game.inventory.deserialize(data.inventory);
    game.inventoryUI.refresh();
    if (game.inventoryUI.onInventoryChange) {
      game.inventoryUI.onInventoryChange();
    }
  }

  await game.furnaceManager.load();
  worldLoading.setProgress(0.3);

  const isMobile = game.renderer.getIsMobile();
  const perfProfileName = getPerfProfileName();
  const perfProfile = getPerfProfile();
  const startupPregenRadius = getStartupPregenRadius(
    perfProfile.startupPregenRadius,
    isMobile,
  );
  const startupPregenBudgetMs = getStartupPregenBudgetMs(
    perfProfile.startupPregenBudgetMs,
    isMobile,
  );

  await game.world.preGenerateAround(spawnX, spawnZ, startupPregenRadius, {
    budgetMs: startupPregenBudgetMs,
    onProgress: (p) => {
      worldLoading.setProgress(0.3 + p * 0.65);
    },
  });

  const safeSpawn = getSurfaceSpawnPosition(game.world, spawnX, spawnZ);
  game.renderer.controls.object.position.copy(safeSpawn);
  worldLoading.setProgress(0.98);

  await new Promise<void>((resolve) => worldLoading.finish(resolve));

  dom.uiContainer.style.display = "block";
  dom.crosshair.style.display = "block";
  if (game.renderer.getIsMobile() && dom.mobileUi) {
    dom.mobileUi.style.display = "block";
  }

  game.resetTime();
  game.gameState.setPaused(false);
  game.gameState.setGameStarted(true);

  if (
    (perfProfileName === "smooth_desktop_v1" ||
      perfProfileName === "smooth_desktop_v2") &&
    !isMobile
  ) {
    void runBackgroundPregen(
      game,
      spawnX,
      spawnZ,
      startupPregenRadius,
      perfProfile.backgroundPregenRadius,
      perfProfile.backgroundPregenBudgetMs,
    );
  }
}

async function runBackgroundPregen(
  game: StartGameOptions["game"],
  spawnX: number,
  spawnZ: number,
  startupRadius: number,
  targetRadius: number,
  budgetMs: number,
): Promise<void> {
  if (targetRadius <= startupRadius || budgetMs <= 0) {
    return;
  }
  try {
    await game.world.preGenerateAround(spawnX, spawnZ, targetRadius, {
      budgetMs,
    });
  } catch (error) {
    console.warn("Background pregen failed:", error);
  }
}
