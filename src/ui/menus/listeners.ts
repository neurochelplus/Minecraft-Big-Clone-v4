import { FeatureToggles } from "../../utils/FeatureToggles";
import { bindSettingsListeners } from "./settings";
import type { MenusContext } from "./types";

export type MenusListenerCallbacks = {
  showSingleplayerMenu(): Promise<void>;
  showMainMenu(): void;
  handlePlayWorldClick(): Promise<void>;
  openCreateDialog(): void;
  handleCreateWorldConfirmClick(): Promise<void>;
  closeCreateDialog(): void;
  handleDeleteWorldClick(): Promise<void>;
  selectRelativeWorld(direction: 1 | -1): void;
  showModManager(): void;
  hidePauseMenu(): void;
  showSettingsMenu(fromMenu: HTMLElement): void;
  hideSettingsMenu(): void;
  handleSaveAndExit(): Promise<void>;
};

export function bindMenusListeners(
  context: MenusContext,
  callbacks: MenusListenerCallbacks,
): void {
  const { dom, buttons, settings, state, game } = context;

  bindSettingsListeners(game, settings);

  buttons.btnNewGame.addEventListener("click", () => {
    void callbacks.showSingleplayerMenu();
  });

  buttons.btnBackSingleplayer.addEventListener("click", () => {
    callbacks.showMainMenu();
  });

  buttons.btnPlayWorld.addEventListener("click", () => {
    void callbacks.handlePlayWorldClick();
  });

  buttons.btnCreateWorld.addEventListener("click", () => {
    callbacks.openCreateDialog();
  });

  buttons.btnCreateWorldConfirm.addEventListener("click", () => {
    void callbacks.handleCreateWorldConfirmClick();
  });

  buttons.btnCreateWorldCancel.addEventListener("click", () => {
    callbacks.closeCreateDialog();
  });

  buttons.btnDeleteWorld.addEventListener("click", () => {
    void callbacks.handleDeleteWorldClick();
  });

  dom.worldList.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      callbacks.selectRelativeWorld(1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      callbacks.selectRelativeWorld(-1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void callbacks.handlePlayWorldClick();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.isCreateDialogOpen) {
      event.preventDefault();
      if (!state.worldOperationInProgress) {
        callbacks.closeCreateDialog();
      }
    }
  });

  const toggles = FeatureToggles.getInstance();
  if (!toggles.isEnabled("show_mods")) {
    buttons.btnMods.style.display = "none";
  } else {
    buttons.btnMods.addEventListener("click", () => callbacks.showModManager());
  }

  buttons.btnResume.addEventListener("click", () => {
    if (game.renderer.getIsMobile()) {
      callbacks.hidePauseMenu();
      return;
    }

    game.gameState.setIsResuming(true);
    document.body.focus();
    game.renderer.controls.lock();
    setTimeout(() => {
      game.gameState.setIsResuming(false);
    }, 1000);
  });

  buttons.btnSettingsMain.addEventListener("click", () => {
    callbacks.showSettingsMenu(dom.mainMenu);
  });

  buttons.btnSettingsPause.addEventListener("click", () => {
    callbacks.showSettingsMenu(dom.pauseMenu);
  });

  buttons.btnBackSettings.addEventListener("click", () => {
    callbacks.hideSettingsMenu();
  });

  buttons.btnExit.addEventListener("click", () => {
    void callbacks.handleSaveAndExit();
  });
}
