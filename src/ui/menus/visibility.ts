import type { MenusDependencies } from "./types";

export function showMainMenuView(deps: MenusDependencies): void {
  const { game, dom } = deps;

  game.gameState.setPaused(true);
  game.gameState.setGameStarted(false);

  dom.mainMenu.style.display = "flex";
  dom.pauseMenu.style.display = "none";
  dom.settingsMenu.style.display = "none";
  dom.inventoryMenu.style.display = "none";
  dom.uiContainer.style.display = "none";
  dom.bgVideo.style.display = "block";
  dom.crosshair.style.display = "none";

  if (!game.renderer.getIsMobile()) {
    document.exitPointerLock();
  }

  if (dom.mobileUi) dom.mobileUi.style.display = "none";
}

export function showPauseMenuView(deps: MenusDependencies): void {
  const { game, dom } = deps;

  game.gameState.setPaused(true);

  dom.pauseMenu.style.display = "flex";
  dom.mainMenu.style.display = "none";
  dom.settingsMenu.style.display = "none";
  dom.inventoryMenu.style.display = "none";
  dom.uiContainer.style.display = "none";
  dom.bgVideo.style.display = "none";
  dom.crosshair.style.display = "none";

  if (!game.renderer.getIsMobile()) {
    document.exitPointerLock();
  }

  if (dom.mobileUi) dom.mobileUi.style.display = "none";
}

export function showSettingsMenuView(
  deps: MenusDependencies,
  parent: HTMLElement,
): void {
  const { game, dom, btnSettingsMain } = deps;

  dom.settingsMenu.style.display = "flex";
  dom.mainMenu.style.display = "none";
  dom.pauseMenu.style.display = "none";
  dom.inventoryMenu.style.display = "none";
  dom.uiContainer.style.display = "none";
  dom.bgVideo.style.display = "none";
  dom.crosshair.style.display = "none";

  if (!game.renderer.getIsMobile()) {
    document.exitPointerLock();
  }

  if (parent === dom.mainMenu) {
    btnSettingsMain.style.display = "none";
  } else {
    btnSettingsMain.style.display = "block";
  }
}

export function hideSettingsMenuView(deps: MenusDependencies): void {
  const { game, dom } = deps;

  dom.settingsMenu.style.display = "none";
  dom.bgVideo.style.display = "none";

  if (!game.renderer.getIsMobile()) {
    document.exitPointerLock();
  }

  if (game.gameState.getGameStarted()) {
    dom.pauseMenu.style.display = "flex";
  } else {
    dom.mainMenu.style.display = "flex";
    dom.bgVideo.style.display = "block";
  }
}

export function hidePauseMenuView(deps: MenusDependencies): void {
  const { game, dom } = deps;

  game.gameState.setPaused(false);
  dom.pauseMenu.style.display = "none";
  dom.bgVideo.style.display = "none";
  dom.inventoryMenu.style.display = "none";
  dom.uiContainer.style.display = "block";
  dom.crosshair.style.display = "block";

  if (game.gameState.getGameStarted()) {
    if (!game.renderer.getIsMobile()) {
      game.renderer.controls.lock();
    } else if (dom.mobileUi) {
      dom.mobileUi.style.display = "block";
    }
  }
}
