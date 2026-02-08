import type { MenusContext } from "./types";

export function showMainMenuView(context: MenusContext): void {
  const { game, dom, state } = context;

  game.gameState.setPaused(true);
  game.gameState.setGameStarted(false);

  dom.mainMenu.style.display = "flex";
  dom.singleplayerMenu.style.display = "none";
  dom.createWorldDialog.style.display = "none";
  state.isCreateDialogOpen = false;
  dom.pauseMenu.style.display = "none";
  dom.settingsMenu.style.display = "none";
  dom.inventoryMenu.style.display = "none";
  dom.uiContainer.style.display = "none";
  dom.bgVideo.style.display = "block";
  dom.crosshair.style.display = "none";

  if (dom.mobileUi) {
    dom.mobileUi.style.display = "none";
  }

  game.renderer.controls.unlock();
}

export function showSingleplayerView(context: MenusContext): void {
  const { game, dom, state } = context;

  dom.mainMenu.style.display = "none";
  dom.pauseMenu.style.display = "none";
  dom.settingsMenu.style.display = "none";
  dom.singleplayerMenu.style.display = "flex";
  dom.createWorldDialog.style.display = "none";
  state.isCreateDialogOpen = false;
  dom.inventoryMenu.style.display = "none";
  dom.uiContainer.style.display = "none";
  dom.bgVideo.style.display = "block";
  dom.crosshair.style.display = "none";

  if (dom.mobileUi) {
    dom.mobileUi.style.display = "none";
  }

  game.renderer.controls.unlock();
}

export function showPauseMenuView(context: MenusContext): void {
  const { game, dom, state } = context;

  game.gameState.setPaused(true);
  dom.pauseMenu.style.display = "flex";
  dom.mainMenu.style.display = "none";
  dom.singleplayerMenu.style.display = "none";
  dom.createWorldDialog.style.display = "none";
  state.isCreateDialogOpen = false;
  dom.settingsMenu.style.display = "none";
  dom.crosshair.style.display = "none";
  game.renderer.controls.unlock();
}

export function hidePauseMenuView(context: MenusContext): void {
  const { game, dom } = context;

  game.gameState.setPaused(false);
  dom.pauseMenu.style.display = "none";
  dom.settingsMenu.style.display = "none";
  dom.crosshair.style.display = "block";
  game.resetTime();
}

export function showSettingsMenuView(
  context: MenusContext,
  fromMenu: HTMLElement,
): void {
  const { game, dom } = context;
  game.gameState.setPreviousMenu(fromMenu);
  fromMenu.style.display = "none";
  dom.settingsMenu.style.display = "flex";
}

export function hideSettingsMenuView(context: MenusContext): void {
  const { dom, game } = context;
  dom.settingsMenu.style.display = "none";
  const previous = game.gameState.getPreviousMenu();
  if (previous) {
    previous.style.display = "flex";
  } else {
    showMainMenuView(context);
  }
}
