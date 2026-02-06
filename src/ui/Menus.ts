import { Game } from "../core/Game";
import { FurnaceManager } from "../crafting/FurnaceManager";
import { modManagerUI } from "../modding";
import { FeatureToggles } from "../utils/FeatureToggles";
import { CHUNK_SIZE } from "../constants/GameConstants";
import type { WorldSummary } from "../contracts/world";

export class Menus {
  private game: Game;

  private mainMenu: HTMLElement;
  private singleplayerMenu: HTMLElement;
  private pauseMenu: HTMLElement;
  private settingsMenu: HTMLElement;
  private inventoryMenu: HTMLElement;
  private uiContainer: HTMLElement;
  private mobileUi: HTMLElement | null;
  private bgVideo: HTMLVideoElement;
  private menuMusic: HTMLAudioElement;
  private crosshair: HTMLElement;

  private btnNewGame: HTMLButtonElement;
  private btnPlayWorld: HTMLButtonElement;
  private btnCreateWorld: HTMLButtonElement;
  private btnDeleteWorld: HTMLButtonElement;
  private btnBackSingleplayer: HTMLButtonElement;
  private btnMultiplayer: HTMLButtonElement;
  private btnMods: HTMLButtonElement;
  private btnResume: HTMLButtonElement;
  private btnExit: HTMLButtonElement;
  private btnSettingsMain: HTMLButtonElement;
  private btnSettingsPause: HTMLButtonElement;
  private btnBackSettings: HTMLButtonElement;

  private worldList: HTMLElement;
  private worldEmptyHint: HTMLElement;
  private createWorldDialog: HTMLElement;
  private createWorldNameInput: HTMLInputElement;
  private createWorldSeedInput: HTMLInputElement;
  private btnCreateWorldConfirm: HTMLButtonElement;
  private btnCreateWorldCancel: HTMLButtonElement;

  private cbShadows: HTMLInputElement;
  private cbClouds: HTMLInputElement;

  private resumeTimeout: number | null = null;
  private worldOperationInProgress = false;
  private hasWorlds = false;
  private storageErrorNotified = false;

  private worldsCache: WorldSummary[] = [];
  private selectedWorldId: string | null = null;
  private isCreateDialogOpen = false;

  constructor(game: Game) {
    this.game = game;

    this.mainMenu = document.getElementById("main-menu")!;
    this.singleplayerMenu = document.getElementById("singleplayer-menu")!;
    this.pauseMenu = document.getElementById("pause-menu")!;
    this.settingsMenu = document.getElementById("settings-menu")!;
    this.inventoryMenu = document.getElementById("inventory-menu")!;
    this.uiContainer = document.getElementById("ui-container")!;
    this.mobileUi = document.getElementById("mobile-ui");
    this.bgVideo = document.getElementById("bg-video") as HTMLVideoElement;
    this.crosshair = document.getElementById("crosshair")!;

    this.btnNewGame = document.getElementById("btn-new-game") as HTMLButtonElement;
    this.btnPlayWorld = document.getElementById("btn-play-world") as HTMLButtonElement;
    this.btnCreateWorld = document.getElementById(
      "btn-create-world",
    ) as HTMLButtonElement;
    this.btnDeleteWorld = document.getElementById("btn-delete-world") as HTMLButtonElement;
    this.btnBackSingleplayer = document.getElementById(
      "btn-back-singleplayer",
    ) as HTMLButtonElement;
    this.btnMultiplayer = document.getElementById(
      "btn-multiplayer",
    ) as HTMLButtonElement;
    this.btnMods = document.getElementById("btn-mods") as HTMLButtonElement;
    this.btnResume = document.getElementById("btn-resume") as HTMLButtonElement;
    this.btnExit = document.getElementById("btn-exit") as HTMLButtonElement;
    this.btnSettingsMain = document.getElementById(
      "btn-settings-main",
    ) as HTMLButtonElement;
    this.btnSettingsPause = document.getElementById(
      "btn-settings-pause",
    ) as HTMLButtonElement;
    this.btnBackSettings = document.getElementById(
      "btn-back-settings",
    ) as HTMLButtonElement;

    this.worldList = document.getElementById("world-list")!;
    this.worldEmptyHint = document.getElementById("world-empty-hint")!;
    this.createWorldDialog = document.getElementById("create-world-dialog")!;
    this.createWorldNameInput = document.getElementById(
      "create-world-name",
    ) as HTMLInputElement;
    this.createWorldSeedInput = document.getElementById(
      "create-world-seed",
    ) as HTMLInputElement;
    this.btnCreateWorldConfirm = document.getElementById(
      "btn-create-world-confirm",
    ) as HTMLButtonElement;
    this.btnCreateWorldCancel = document.getElementById(
      "btn-create-world-cancel",
    ) as HTMLButtonElement;

    this.cbShadows = document.getElementById("cb-shadows") as HTMLInputElement;
    this.cbClouds = document.getElementById("cb-clouds") as HTMLInputElement;

    this.menuMusic = new Audio("/menu_music.mp3");
    this.menuMusic.loop = true;
    this.menuMusic.volume = 0.3;

    document.addEventListener(
      "click",
      () => {
        if (this.mainMenu.style.display === "flex" && this.menuMusic.paused) {
          this.menuMusic.play().catch(() => {});
        }
      },
      { once: true },
    );

    this.btnMultiplayer.disabled = true;

    this.initListeners();
  }

  private initListeners(): void {
    this.cbShadows.addEventListener("change", () => {
      this.game.environment.setShadowsEnabled(this.cbShadows.checked);
    });

    this.cbClouds.addEventListener("change", () => {
      this.game.environment.setCloudsEnabled(this.cbClouds.checked);
    });

    this.btnNewGame.addEventListener("click", () => {
      void this.showSingleplayerMenu();
    });

    this.btnBackSingleplayer.addEventListener("click", () => {
      this.showMainMenu();
    });

    this.btnPlayWorld.addEventListener("click", () => {
      void this.handlePlayWorldClick();
    });

    this.btnCreateWorld.addEventListener("click", () => {
      this.openCreateDialog();
    });

    this.btnCreateWorldConfirm.addEventListener("click", () => {
      void this.handleCreateWorldConfirmClick();
    });

    this.btnCreateWorldCancel.addEventListener("click", () => {
      this.closeCreateDialog();
    });

    this.btnDeleteWorld.addEventListener("click", () => {
      void this.handleDeleteWorldClick();
    });

    this.worldList.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.selectRelativeWorld(1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        this.selectRelativeWorld(-1);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void this.handlePlayWorldClick();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isCreateDialogOpen) {
        event.preventDefault();
        if (!this.worldOperationInProgress) {
          this.closeCreateDialog();
        }
      }
    });

    const toggles = FeatureToggles.getInstance();
    if (!toggles.isEnabled("show_mods")) {
      this.btnMods.style.display = "none";
    } else {
      this.btnMods.addEventListener("click", () => this.showModManager());
    }

    this.btnResume.addEventListener("click", () => {
      if (this.game.renderer.getIsMobile()) {
        this.hidePauseMenu();
        return;
      }

      this.game.gameState.setIsResuming(true);
      document.body.focus();
      this.game.renderer.controls.lock();
      setTimeout(() => {
        this.game.gameState.setIsResuming(false);
      }, 1000);
    });

    this.btnSettingsMain.addEventListener("click", () => {
      this.showSettingsMenu(this.mainMenu);
    });

    this.btnSettingsPause.addEventListener("click", () => {
      this.showSettingsMenu(this.pauseMenu);
    });

    this.btnBackSettings.addEventListener("click", () => {
      this.hideSettingsMenu();
    });

    this.btnExit.addEventListener("click", () => {
      void this.handleSaveAndExit();
    });
  }

  private updateSingleplayerActionState(): void {
    const hasSelection = this.selectedWorldId !== null;
    const controlsLocked = this.worldOperationInProgress || this.isCreateDialogOpen;

    this.btnPlayWorld.disabled = controlsLocked || !hasSelection;
    this.btnDeleteWorld.disabled = controlsLocked || !hasSelection;
    this.btnCreateWorld.disabled = this.worldOperationInProgress || this.isCreateDialogOpen;
    this.btnBackSingleplayer.disabled = this.worldOperationInProgress;

    const rows = this.worldList.querySelectorAll<HTMLButtonElement>(".world-row");
    rows.forEach((row) => {
      row.disabled = controlsLocked;
    });

    this.worldList.classList.toggle("world-list--disabled", controlsLocked);
    this.worldEmptyHint.style.display = this.hasWorlds ? "none" : "block";
  }

  private setCreateDialogControlsDisabled(disabled: boolean): void {
    this.createWorldNameInput.disabled = disabled;
    this.createWorldSeedInput.disabled = disabled;
    this.btnCreateWorldConfirm.disabled = disabled;
    this.btnCreateWorldCancel.disabled = disabled;
  }

  private openCreateDialog(): void {
    if (this.worldOperationInProgress || this.isCreateDialogOpen) {
      return;
    }

    this.isCreateDialogOpen = true;
    this.createWorldDialog.style.display = "flex";
    this.createWorldNameInput.value = "";
    this.createWorldSeedInput.value = "";
    this.setCreateDialogControlsDisabled(false);
    this.updateSingleplayerActionState();
    this.createWorldNameInput.focus();
  }

  private closeCreateDialog(): void {
    if (!this.isCreateDialogOpen) {
      return;
    }

    this.isCreateDialogOpen = false;
    this.createWorldDialog.style.display = "none";
    this.setCreateDialogControlsDisabled(false);
    this.updateSingleplayerActionState();
  }

  private renderWorldList(worlds: WorldSummary[], selectedWorldId: string | null): void {
    this.worldList.innerHTML = "";

    if (worlds.length === 0) {
      return;
    }

    for (const world of worlds) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "world-row";
      row.dataset.worldId = world.id;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(world.id === selectedWorldId));

      if (world.id === selectedWorldId) {
        row.classList.add("selected");
      }

      const name = document.createElement("span");
      name.className = "world-row__name";
      name.textContent = world.name;

      const meta = document.createElement("span");
      meta.className = "world-row__meta";
      meta.textContent = `сид ${world.seed}`;

      row.append(name, meta);

      row.addEventListener("click", () => {
        this.selectWorld(world.id);
      });

      row.addEventListener("dblclick", () => {
        void this.handlePlayWorldClick();
      });

      this.worldList.appendChild(row);
    }
  }

  private selectWorld(worldId: string | null): void {
    if (worldId === null) {
      this.selectedWorldId = null;
      this.renderWorldList(this.worldsCache, this.selectedWorldId);
      this.updateSingleplayerActionState();
      return;
    }

    const worldExists = this.worldsCache.some((world) => world.id === worldId);
    if (!worldExists) {
      return;
    }

    this.selectedWorldId = worldId;
    this.renderWorldList(this.worldsCache, this.selectedWorldId);
    this.updateSingleplayerActionState();

    const selectedRow = this.worldList.querySelector<HTMLButtonElement>(
      `.world-row[data-world-id="${worldId}"]`,
    );
    selectedRow?.focus();
  }

  private selectRelativeWorld(direction: 1 | -1): void {
    if (this.worldsCache.length === 0) {
      return;
    }

    const currentIndex = this.worldsCache.findIndex(
      (world) => world.id === this.selectedWorldId,
    );

    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = Math.min(
      this.worldsCache.length - 1,
      Math.max(0, startIndex + direction),
    );

    this.selectWorld(this.worldsCache[nextIndex].id);
  }

  private parseCreateSeed(): number | undefined {
    const rawSeed = this.createWorldSeedInput.value.trim();
    if (!rawSeed) {
      return undefined;
    }

    const parsed = Number(rawSeed);
    if (!Number.isFinite(parsed)) {
      alert("Некорректный сид. Будет использован случайный.");
      return undefined;
    }

    const normalized = Math.floor(parsed);
    if (normalized < 0 || normalized > 0xffffffff) {
      alert("Сид вне диапазона (0..4294967295). Будет использован случайный.");
      return undefined;
    }

    return normalized >>> 0;
  }

  private async refreshWorlds(preferredWorldId?: string): Promise<void> {
    try {
      const worlds = await this.game.world.listWorlds();
      const activeWorldId = await this.game.world.getActiveWorldId();
      this.storageErrorNotified = false;
      this.worldsCache = worlds;
      this.hasWorlds = worlds.length > 0;

      const ids = new Set(worlds.map((world) => world.id));
      if (preferredWorldId && ids.has(preferredWorldId)) {
        this.selectedWorldId = preferredWorldId;
      } else if (this.selectedWorldId && ids.has(this.selectedWorldId)) {
        // keep current selection
      } else if (activeWorldId && ids.has(activeWorldId)) {
        this.selectedWorldId = activeWorldId;
      } else {
        this.selectedWorldId = worlds[0]?.id ?? null;
      }

      this.renderWorldList(this.worldsCache, this.selectedWorldId);
      this.updateSingleplayerActionState();
    } catch (error) {
      this.worldsCache = [];
      this.hasWorlds = false;
      this.selectedWorldId = null;
      this.renderWorldList([], null);
      this.updateSingleplayerActionState();

      console.error("Failed to refresh worlds", error);
      if (!this.storageErrorNotified) {
        this.storageErrorNotified = true;
        alert("Не удалось открыть сохранения. Проверьте доступ к IndexedDB.");
      }
    }
  }

  private async handleCreateWorldConfirmClick(): Promise<void> {
    if (this.worldOperationInProgress) {
      return;
    }

    this.worldOperationInProgress = true;
    this.updateSingleplayerActionState();
    this.setCreateDialogControlsDisabled(true);

    try {
      const name = this.createWorldNameInput.value.trim();
      const seed = this.parseCreateSeed();

      const world = await this.game.world.createWorld({ name, seed });
      await this.game.world.setActiveWorld(world.id);
      this.closeCreateDialog();
      await this.refreshWorlds(world.id);
      await this.startGame(world.id);
    } catch (error) {
      console.error("Failed to create world", error);
      alert(`Не удалось создать мир: ${String(error)}`);
    } finally {
      this.worldOperationInProgress = false;
      this.setCreateDialogControlsDisabled(false);
      this.updateSingleplayerActionState();
    }
  }

  private async handlePlayWorldClick(): Promise<void> {
    if (this.worldOperationInProgress) {
      return;
    }

    if (!this.selectedWorldId) {
      this.updateSingleplayerActionState();
      return;
    }

    this.worldOperationInProgress = true;
    this.updateSingleplayerActionState();

    try {
      await this.game.world.setActiveWorld(this.selectedWorldId);
      await this.startGame(this.selectedWorldId);
    } catch (error) {
      console.error("Failed to continue world", error);
      alert(`Не удалось загрузить мир: ${String(error)}`);
    } finally {
      this.worldOperationInProgress = false;
      this.updateSingleplayerActionState();
    }
  }

  private async handleDeleteWorldClick(): Promise<void> {
    if (this.worldOperationInProgress || !this.selectedWorldId) {
      return;
    }

    const world = this.worldsCache.find((item) => item.id === this.selectedWorldId);
    const worldName = world?.name ?? "выбранный мир";

    const confirmed = window.confirm(
      `Удалить мир \"${worldName}\"? Это действие нельзя отменить.`,
    );
    if (!confirmed) {
      return;
    }

    this.worldOperationInProgress = true;
    this.updateSingleplayerActionState();

    try {
      const deletedWorldId = this.selectedWorldId;
      await this.game.world.deleteWorld(deletedWorldId);
      this.selectedWorldId = null;
      await this.refreshWorlds();
    } catch (error) {
      console.error("Failed to delete world", error);
      alert("Не удалось удалить мир.");
    } finally {
      this.worldOperationInProgress = false;
      this.updateSingleplayerActionState();
    }
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
    this.mainMenu.style.display = "none";
    this.pauseMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.singleplayerMenu.style.display = "flex";
    this.createWorldDialog.style.display = "none";
    this.isCreateDialogOpen = false;
    this.inventoryMenu.style.display = "none";
    this.uiContainer.style.display = "none";
    this.bgVideo.style.display = "block";
    this.crosshair.style.display = "none";

    if (this.menuMusic.paused) {
      this.menuMusic.play().catch(() => {});
    }

    if (this.mobileUi) {
      this.mobileUi.style.display = "none";
    }

    this.game.renderer.controls.unlock();
    await this.refreshWorlds();
  }

  private async startGame(worldId: string): Promise<void> {
    if (!this.game.renderer.getIsMobile()) {
      this.game.renderer.controls.lock();
    }

    this.btnPlayWorld.innerText = "Загрузка...";

    try {
      const data = await this.game.world.loadWorld(worldId);
      await FurnaceManager.getInstance().load();

      if (data.inventory) {
        this.game.inventory.deserialize(data.inventory);
      } else {
        this.game.inventory.clear();
      }
      this.game.inventoryUI.refresh();

      if (data.playerPosition) {
        const cx = Math.floor(data.playerPosition.x / CHUNK_SIZE);
        const cz = Math.floor(data.playerPosition.z / CHUNK_SIZE);
        await this.game.world.waitForChunk(cx, cz);

        const safePos = data.playerPosition.clone();
        safePos.y += 0.1;
        this.game.renderer.controls.object.position.copy(safePos);
      } else {
        this.game.player.health.respawn();

        const spawnX = 8;
        const spawnZ = 20;
        const cx = Math.floor(spawnX / CHUNK_SIZE);
        const cz = Math.floor(spawnZ / CHUNK_SIZE);
        await this.game.world.waitForChunk(cx, cz);

        const topY = this.game.world.getTopY(spawnX, spawnZ);
        this.game.renderer.controls.object.position.set(
          spawnX + 0.5,
          topY + 3,
          spawnZ + 0.5,
        );
      }

      this.game.player.physics.setVelocity({ x: 0, y: 0, z: 0 } as any);

      this.game.gameState.setGameStarted(true);
      this.game.gameState.setPaused(false);
      this.game.resetTime();

      this.mainMenu.style.display = "none";
      this.singleplayerMenu.style.display = "none";
      this.createWorldDialog.style.display = "none";
      this.isCreateDialogOpen = false;
      this.pauseMenu.style.display = "none";
      this.settingsMenu.style.display = "none";
      this.uiContainer.style.display = "flex";
      this.bgVideo.style.display = "none";
      this.menuMusic.pause();
      this.menuMusic.currentTime = 0;
      this.crosshair.style.display = "block";

      if (this.mobileUi && this.game.renderer.getIsMobile()) {
        this.mobileUi.style.display = "block";
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (error) {
      console.error("Failed to start game", error);
      alert(`Ошибка запуска игры: ${String(error)}`);
      if (!this.game.renderer.getIsMobile()) {
        this.game.renderer.controls.unlock();
      }
    } finally {
      this.btnPlayWorld.innerText = "Играть";
    }
  }

  public showMainMenu(): void {
    this.game.gameState.setPaused(true);
    this.game.gameState.setGameStarted(false);

    this.mainMenu.style.display = "flex";
    this.singleplayerMenu.style.display = "none";
    this.createWorldDialog.style.display = "none";
    this.isCreateDialogOpen = false;
    this.pauseMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.inventoryMenu.style.display = "none";
    this.uiContainer.style.display = "none";
    this.bgVideo.style.display = "block";
    this.crosshair.style.display = "none";

    this.menuMusic.play().catch(() => {});

    if (this.mobileUi) {
      this.mobileUi.style.display = "none";
    }

    this.game.renderer.controls.unlock();
  }

  public showPauseMenu(): void {
    this.game.gameState.setPaused(true);
    this.pauseMenu.style.display = "flex";
    this.mainMenu.style.display = "none";
    this.singleplayerMenu.style.display = "none";
    this.createWorldDialog.style.display = "none";
    this.isCreateDialogOpen = false;
    this.settingsMenu.style.display = "none";
    this.game.renderer.controls.unlock();
    this.crosshair.style.display = "none";

    if (this.game.gameState.getGameStarted()) {
      void this.game.saveCoordinator?.requestSave("pause");
    }

    if (!this.game.renderer.getIsMobile()) {
      if (this.resumeTimeout !== null) {
        clearTimeout(this.resumeTimeout);
      }

      this.btnResume.style.pointerEvents = "none";
      this.btnResume.style.opacity = "0.5";
      this.btnResume.innerText = "Подождите...";

      this.resumeTimeout = window.setTimeout(() => {
        if (this.pauseMenu.style.display === "flex") {
          this.btnResume.style.pointerEvents = "auto";
          this.btnResume.style.opacity = "1";
          this.btnResume.innerText = "Продолжить";
        }
        this.resumeTimeout = null;
      }, 1300);
    }
  }

  public hidePauseMenu(): void {
    this.game.gameState.setPaused(false);
    this.pauseMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.crosshair.style.display = "block";

    if (this.resumeTimeout !== null) {
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }

    if (!this.game.renderer.getIsMobile()) {
      this.btnResume.style.pointerEvents = "auto";
      this.btnResume.style.opacity = "1";
      this.btnResume.innerText = "Продолжить";
    }

    this.game.resetTime();
  }

  public togglePauseMenu(): void {
    if (!this.game.gameState.getGameStarted()) {
      return;
    }

    if (this.settingsMenu.style.display === "flex") {
      this.hideSettingsMenu();
      return;
    }

    if (this.game.gameState.getPaused()) {
      this.hidePauseMenu();
      return;
    }

    this.showPauseMenu();
  }

  private showSettingsMenu(fromMenu: HTMLElement): void {
    this.game.gameState.setPreviousMenu(fromMenu);
    fromMenu.style.display = "none";
    this.settingsMenu.style.display = "flex";
  }

  private hideSettingsMenu(): void {
    this.settingsMenu.style.display = "none";
    const previous = this.game.gameState.getPreviousMenu();
    if (previous) {
      previous.style.display = "flex";
    } else {
      this.showMainMenu();
    }
  }

  private showModManager(): void {
    modManagerUI.show();
  }
}
