import * as THREE from "three";
import { CHUNK_SIZE } from "../../constants/GameConstants";
import { FurnaceManager } from "../../crafting/FurnaceManager";
import { stopAndResetMenuMusic } from "./audio";
import type { StartGameOptions } from "./types";

export async function startGameFlow(options: StartGameOptions): Promise<void> {
  const { game, dom, buttons, state, menuMusic, worldId } = options;

  if (!game.renderer.getIsMobile()) {
    game.renderer.controls.lock();
  }

  buttons.btnPlayWorld.innerText = "Загрузка...";

  try {
    const data = await game.world.loadWorld(worldId);
    await FurnaceManager.getInstance().load();

    if (data.inventory) {
      game.inventory.deserialize(data.inventory);
    } else {
      game.inventory.clear();
    }
    game.inventoryUI.refresh();

    if (data.playerPosition) {
      const cx = Math.floor(data.playerPosition.x / CHUNK_SIZE);
      const cz = Math.floor(data.playerPosition.z / CHUNK_SIZE);
      await game.world.waitForChunk(cx, cz);

      const safePos = data.playerPosition.clone();
      safePos.y += 0.1;
      game.renderer.controls.object.position.copy(safePos);
    } else {
      game.player.health.respawn();

      const spawnX = 8;
      const spawnZ = 20;
      const cx = Math.floor(spawnX / CHUNK_SIZE);
      const cz = Math.floor(spawnZ / CHUNK_SIZE);
      await game.world.waitForChunk(cx, cz);

      const topY = game.world.getTopY(spawnX, spawnZ);
      game.renderer.controls.object.position.set(spawnX + 0.5, topY + 3, spawnZ + 0.5);
    }

    game.player.physics.setVelocity(new THREE.Vector3(0, 0, 0));

    game.gameState.setGameStarted(true);
    game.gameState.setPaused(false);
    game.resetTime();

    dom.mainMenu.style.display = "none";
    dom.singleplayerMenu.style.display = "none";
    dom.createWorldDialog.style.display = "none";
    state.isCreateDialogOpen = false;
    dom.pauseMenu.style.display = "none";
    dom.settingsMenu.style.display = "none";
    dom.uiContainer.style.display = "flex";
    dom.bgVideo.style.display = "none";
    stopAndResetMenuMusic(menuMusic);
    dom.crosshair.style.display = "block";

    if (dom.mobileUi && game.renderer.getIsMobile()) {
      dom.mobileUi.style.display = "block";
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch (error) {
    console.error("Failed to start game", error);
    alert(`Ошибка запуска игры: ${String(error)}`);
    if (!game.renderer.getIsMobile()) {
      game.renderer.controls.unlock();
    }
  } finally {
    buttons.btnPlayWorld.innerText = "Играть";
  }
}
