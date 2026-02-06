import { Game } from "../core/Game";
import { modManagerUI } from "../modding";
import {
  bindMenusListeners,
  createMenuMusic,
  getMenusButtons,
  getMenusDomElements,
  getMenusSettings,
  getRelativeWorldId,
  handleCreateWorld,
  handleDeleteWorld,
  handlePlayWorld,
  hidePauseFlow,
  hideSettingsMenuView,
  parseCreateSeed,
  playMenuMusicIfNeeded,
  refreshWorlds as refreshWorldsAction,
  renderWorldList,
  setCreateDialogControlsDisabled,
  showPauseFlow,
  showMainMenuView,
  showSettingsMenuView,
  showSingleplayerView,
  startGameFlow,
  togglePauseFlow,
  updateSingleplayerActionState,
} from "./menus/index";
import type { MenusContext, MenusState } from "./menus/index";

export class Menus {
  private game: Game;
  private context: MenusContext;

  constructor(game: Game) {
    this.game = game;

    const dom = getMenusDomElements();
    const buttons = getMenusButtons();
    const settings = getMenusSettings();
    const state: MenusState = {
      resumeTimeout: null,
      worldOperationInProgress: false,
      hasWorlds: false,
      storageErrorNotified: false,
      worldsCache: [],
      selectedWorldId: null,
      isCreateDialogOpen: false,
    };

    this.context = {
      game,
      dom,
      buttons,
      settings,
      state,
      menuMusic: createMenuMusic(dom.mainMenu),
    };

    this.context.buttons.btnMultiplayer.disabled = true;
    this.initListeners();
  }

  private initListeners(): void {
    bindMenusListeners(this.context, {
      showSingleplayerMenu: () => this.showSingleplayerMenu(),
      showMainMenu: () => this.showMainMenu(),
      handlePlayWorldClick: () => this.handlePlayWorldClick(),
      openCreateDialog: () => this.openCreateDialog(),
      handleCreateWorldConfirmClick: () => this.handleCreateWorldConfirmClick(),
      closeCreateDialog: () => this.closeCreateDialog(),
      handleDeleteWorldClick: () => this.handleDeleteWorldClick(),
      selectRelativeWorld: (direction) => this.selectRelativeWorld(direction),
      showModManager: () => this.showModManager(),
      hidePauseMenu: () => this.hidePauseMenu(),
      showSettingsMenu: (fromMenu) => this.showSettingsMenu(fromMenu),
      hideSettingsMenu: () => this.hideSettingsMenu(),
      handleSaveAndExit: () => this.handleSaveAndExit(),
    });
  }

  private renderWorldRows(worldIdToFocus?: string): void {
    const { dom, state } = this.context;
    renderWorldList({
      worldList: dom.worldList,
      worlds: state.worldsCache,
      selectedWorldId: state.selectedWorldId,
      onSelect: (worldId) => {
        this.selectWorld(worldId);
      },
      onActivate: () => {
        void this.handlePlayWorldClick();
      },
    });

    if (worldIdToFocus) {
      const selectedRow = dom.worldList.querySelector<HTMLButtonElement>(
        `.world-row[data-world-id="${worldIdToFocus}"]`,
      );
      selectedRow?.focus();
    }
  }

  private openCreateDialog(): void {
    const { state, dom } = this.context;
    if (state.worldOperationInProgress || state.isCreateDialogOpen) {
      return;
    }

    state.isCreateDialogOpen = true;
    dom.createWorldDialog.style.display = "flex";
    dom.createWorldNameInput.value = "";
    dom.createWorldSeedInput.value = "";
    setCreateDialogControlsDisabled(this.context, false);
    updateSingleplayerActionState(this.context);
    dom.createWorldNameInput.focus();
  }

  private closeCreateDialog(): void {
    const { state, dom } = this.context;
    if (!state.isCreateDialogOpen) {
      return;
    }

    state.isCreateDialogOpen = false;
    dom.createWorldDialog.style.display = "none";
    setCreateDialogControlsDisabled(this.context, false);
    updateSingleplayerActionState(this.context);
  }

  private selectWorld(worldId: string | null): void {
    const { state } = this.context;

    if (worldId === null) {
      state.selectedWorldId = null;
      this.renderWorldRows();
      updateSingleplayerActionState(this.context);
      return;
    }

    const worldExists = state.worldsCache.some((world) => world.id === worldId);
    if (!worldExists) {
      return;
    }

    state.selectedWorldId = worldId;
    this.renderWorldRows(worldId);
    updateSingleplayerActionState(this.context);
  }

  private selectRelativeWorld(direction: 1 | -1): void {
    const { state } = this.context;
    const nextWorldId = getRelativeWorldId(
      state.worldsCache,
      state.selectedWorldId,
      direction,
    );
    if (!nextWorldId) {
      return;
    }
    this.selectWorld(nextWorldId);
  }

  private async refreshWorlds(preferredWorldId?: string): Promise<void> {
    await refreshWorldsAction({
      context: this.context,
      preferredWorldId,
      renderWorldRows: () => {
        this.renderWorldRows();
      },
      updateActionState: () => {
        updateSingleplayerActionState(this.context);
      },
    });
  }

  private async handleCreateWorldConfirmClick(): Promise<void> {
    await handleCreateWorld({
      context: this.context,
      parseSeed: () => parseCreateSeed(this.context.dom.createWorldSeedInput.value.trim()),
      closeCreateDialog: () => {
        this.closeCreateDialog();
      },
      refreshWorlds: async (preferredWorldId?: string) => {
        await this.refreshWorlds(preferredWorldId);
      },
      startGame: async (worldId: string) => {
        await this.startGame(worldId);
      },
      updateActionState: () => {
        updateSingleplayerActionState(this.context);
      },
      setCreateDialogControlsDisabled: (disabled: boolean) => {
        setCreateDialogControlsDisabled(this.context, disabled);
      },
    });
  }

  private async handlePlayWorldClick(): Promise<void> {
    await handlePlayWorld({
      context: this.context,
      startGame: async (worldId: string) => {
        await this.startGame(worldId);
      },
      updateActionState: () => {
        updateSingleplayerActionState(this.context);
      },
    });
  }

  private async handleDeleteWorldClick(): Promise<void> {
    await handleDeleteWorld({
      context: this.context,
      refreshWorlds: async (preferredWorldId?: string) => {
        await this.refreshWorlds(preferredWorldId);
      },
      updateActionState: () => {
        updateSingleplayerActionState(this.context);
      },
    });
  }

  private async handleSaveAndExit(): Promise<void> {
    try {
      if (this.game.saveCoordinator && this.game.gameState.getGameStarted()) {
        await this.game.saveCoordinator.flush("exit");
      }
    } catch (error) {
      console.error("Failed to save before exit", error);
    }

    this.showMainMenu();
  }

  private async showSingleplayerMenu(): Promise<void> {
    showSingleplayerView(this.context);
    playMenuMusicIfNeeded(this.context.dom.mainMenu, this.context.menuMusic);
    await this.refreshWorlds();
  }

  private async startGame(worldId: string): Promise<void> {
    await startGameFlow({
      game: this.game,
      dom: this.context.dom,
      buttons: this.context.buttons,
      state: this.context.state,
      menuMusic: this.context.menuMusic,
      worldId,
    });
  }

  public showMainMenu(): void {
    showMainMenuView(this.context);
    playMenuMusicIfNeeded(this.context.dom.mainMenu, this.context.menuMusic);
  }

  public showPauseMenu(): void {
    showPauseFlow(this.context);
  }
  public hidePauseMenu(): void {
    hidePauseFlow(this.context);
  }
  public togglePauseMenu(): void {
    togglePauseFlow(this.context, {
      hideSettingsMenu: () => this.hideSettingsMenu(),
      hidePauseMenu: () => this.hidePauseMenu(),
      showPauseMenu: () => this.showPauseMenu(),
    });
  }
  private showSettingsMenu(fromMenu: HTMLElement): void {
    showSettingsMenuView(this.context, fromMenu);
  }

  private hideSettingsMenu(): void {
    hideSettingsMenuView(this.context);
  }

  private showModManager(): void {
    modManagerUI.show();
  }
}

