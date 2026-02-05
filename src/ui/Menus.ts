import type { IGameRuntime } from "../contracts/game";
import { worldDB } from "../utils/DB";
import type { IStorage } from "../contracts/storage";
import { getSurfaceSpawnPosition } from "../utils/SpawnUtils";

export class Menus {
  private game: IGameRuntime;
  private storage: IStorage = worldDB;

  private mainMenu: HTMLElement;
  private pauseMenu: HTMLElement;
  private settingsMenu: HTMLElement;
  private inventoryMenu: HTMLElement;
  private uiContainer: HTMLElement;
  private mobileUi: HTMLElement | null;
  private bgVideo: HTMLVideoElement;
  private menuMusic: HTMLAudioElement;
  private crosshair: HTMLElement;

  // Buttons
  private btnNewGame: HTMLElement;
  private btnContinue: HTMLButtonElement;
  private btnResume: HTMLElement;
  private btnExit: HTMLElement;
  private btnSettingsMain: HTMLElement;
  private btnSettingsPause: HTMLElement;
  private btnBackSettings: HTMLElement;

  // Settings
  private cbShadows: HTMLInputElement;
  private cbClouds: HTMLInputElement;

  constructor(game: IGameRuntime) {
    this.game = game;

    this.mainMenu = document.getElementById("main-menu")!;
    this.pauseMenu = document.getElementById("pause-menu")!;
    this.settingsMenu = document.getElementById("settings-menu")!;
    this.inventoryMenu = document.getElementById("inventory-menu")!;
    this.uiContainer = document.getElementById("ui-container")!;
    this.mobileUi = document.getElementById("mobile-ui");
    this.bgVideo = document.getElementById("bg-video") as HTMLVideoElement;
    this.crosshair = document.getElementById("crosshair")!;

    this.menuMusic = new Audio("/menu_music.mp3");
    this.menuMusic.loop = true;
    this.menuMusic.volume = 0.3;

    // Autoplay policy handling
    document.addEventListener(
      "click",
      () => {
        if (this.mainMenu.style.display === "flex" && this.menuMusic.paused) {
          this.menuMusic.play().catch(() => {});
        }
      },
      { once: true },
    );

    this.btnNewGame = document.getElementById("btn-new-game")!;
    this.btnContinue = document.getElementById(
      "btn-continue",
    )! as HTMLButtonElement;
    this.btnResume = document.getElementById("btn-resume")!;
    this.btnExit = document.getElementById("btn-exit")!;
    this.btnSettingsMain = document.getElementById("btn-settings-main")!;
    this.btnSettingsPause = document.getElementById("btn-settings-pause")!;
    this.btnBackSettings = document.getElementById("btn-back-settings")!;

    this.cbShadows = document.getElementById("cb-shadows") as HTMLInputElement;
    this.cbClouds = document.getElementById("cb-clouds") as HTMLInputElement;

    this.btnContinue.disabled = true; // Default to disabled
    this.checkSaveState();

    this.initListeners();
  }

  private async checkSaveState() {
    const hasSave = await this.storage.hasSavedData();
    this.btnContinue.disabled = !hasSave;
  }

  private initListeners() {
    this.cbShadows.addEventListener("change", () => {
      this.game.environment.setShadowsEnabled(this.cbShadows.checked);
    });

    this.cbClouds.addEventListener("change", () => {
      this.game.environment.setCloudsEnabled(this.cbClouds.checked);
    });

    this.btnNewGame.addEventListener("click", () => this.startGame(false));
    this.btnContinue.addEventListener("click", () => this.startGame(true));
    this.btnResume.addEventListener("click", () => {
      if (this.game.renderer.getIsMobile()) {
        this.hidePauseMenu();
      } else {
        // STRICT SEQUENCE:
        // 1. Set flag to ignore potential 'unlock' noise during transition.
        this.game.gameState.setIsResuming(true);
        // 2. Focus body to ensure lock target is valid.
        document.body.focus();
        // 3. Request lock. Visual hiding happens in main.ts 'lock' event.
        this.game.renderer.controls.lock();

        // Safety timeout: reset flag if lock fails (rare but possible)
        setTimeout(() => {
          this.game.gameState.setIsResuming(false);
        }, 1000);
      }
    });
    this.btnSettingsMain.addEventListener("click", () =>
      this.showSettingsMenu(this.mainMenu),
    );
    this.btnSettingsPause.addEventListener("click", () =>
      this.showSettingsMenu(this.pauseMenu),
    );
    this.btnBackSettings.addEventListener("click", () =>
      this.hideSettingsMenu(),
    );

    this.btnExit.addEventListener("click", async () => {
      await this.game.world.saveWorld({
        position: this.game.renderer.controls.object.position,
        inventory: this.game.inventory.serialize(),
      });
      this.showMainMenu();
    });
  }

  public showMainMenu() {
    this.checkSaveState();
    this.game.gameState.setPaused(true);
    this.game.gameState.setGameStarted(false);

    this.mainMenu.style.display = "flex";
    this.pauseMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.inventoryMenu.style.display = "none";
    this.uiContainer.style.display = "none";
    this.bgVideo.style.display = "block"; // Show video
    this.crosshair.style.display = "none";

    if (!this.game.renderer.getIsMobile()) {
      // Show cursor
      document.exitPointerLock();
    }

    // Hide mobile UI
    if (this.mobileUi) this.mobileUi.style.display = "none";
  }

  public showPauseMenu() {
    this.game.gameState.setPaused(true);

    this.pauseMenu.style.display = "flex";
    this.mainMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.inventoryMenu.style.display = "none";
    this.uiContainer.style.display = "none";
    this.bgVideo.style.display = "none"; // Hide video when in-game
    this.crosshair.style.display = "none";

    if (!this.game.renderer.getIsMobile()) {
      document.exitPointerLock();
    }

    // Hide mobile UI
    if (this.mobileUi) this.mobileUi.style.display = "none";
  }

  private showSettingsMenu(parent: HTMLElement) {
    this.settingsMenu.style.display = "flex";
    this.mainMenu.style.display = "none";
    this.pauseMenu.style.display = "none";
    this.inventoryMenu.style.display = "none";
    this.uiContainer.style.display = "none";
    this.bgVideo.style.display = "none";
    this.crosshair.style.display = "none";

    if (!this.game.renderer.getIsMobile()) {
      document.exitPointerLock();
    }

    if (parent === this.mainMenu) {
      this.btnSettingsMain.style.display = "none";
    } else {
      this.btnSettingsMain.style.display = "block";
    }
  }

  private hideSettingsMenu() {
    this.settingsMenu.style.display = "none";
    this.bgVideo.style.display = "none";

    if (!this.game.renderer.getIsMobile()) {
      document.exitPointerLock();
    }

    if (this.game.gameState.getGameStarted()) {
      this.pauseMenu.style.display = "flex";
    } else {
      this.mainMenu.style.display = "flex";
      this.bgVideo.style.display = "block";
    }
  }

  public async startGame(loadSave: boolean) {
    this.game.gameState.setPaused(false);
    this.game.gameState.setGameStarted(true);

    this.mainMenu.style.display = "none";
    this.pauseMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.inventoryMenu.style.display = "none";
    this.uiContainer.style.display = "block";
    this.bgVideo.style.display = "none";
    this.crosshair.style.display = "block";

    if (this.menuMusic) {
      this.menuMusic.pause();
      this.menuMusic.currentTime = 0;
    }

    // Request pointer lock immediately while still in user gesture context.
    if (!this.game.renderer.getIsMobile()) {
      if (this.game.renderer.controls.isLocked !== true) {
        document.body.focus();
        this.game.renderer.controls.lock();
      }
    } else if (this.mobileUi) {
      this.mobileUi.style.display = "block";
    }

    if (loadSave) {
      const data = await this.game.world.loadWorld();
      const spawnX =
        data.playerPosition?.x ??
        this.game.renderer.controls.object.position.x;
      const spawnZ =
        data.playerPosition?.z ??
        this.game.renderer.controls.object.position.z;

      if (data.inventory) {
        this.game.inventory.deserialize(data.inventory);
        this.game.inventoryUI.refresh();
        if (this.game.inventoryUI.onInventoryChange)
          this.game.inventoryUI.onInventoryChange();
      }

      const cx = Math.floor(spawnX / 32);
      const cz = Math.floor(spawnZ / 32);
      await this.game.world.waitForChunk(cx, cz);

      const safeSpawn = getSurfaceSpawnPosition(
        this.game.world,
        spawnX,
        spawnZ,
      );
      this.game.renderer.controls.object.position.copy(safeSpawn);
    } else {
      await this.game.world.deleteWorld();
      await this.game.world.loadChunk(0, 0);

      const spawnX = this.game.renderer.controls.object.position.x;
      const spawnZ = this.game.renderer.controls.object.position.z;
      const cx = Math.floor(spawnX / 32);
      const cz = Math.floor(spawnZ / 32);
      await this.game.world.waitForChunk(cx, cz);

      const safeSpawn = getSurfaceSpawnPosition(
        this.game.world,
        spawnX,
        spawnZ,
      );
      this.game.renderer.controls.object.position.copy(safeSpawn);
    }
  }

  public hidePauseMenu() {
    this.game.gameState.setPaused(false);
    this.pauseMenu.style.display = "none";
    this.bgVideo.style.display = "none";
    this.inventoryMenu.style.display = "none";
    this.uiContainer.style.display = "block";
    this.crosshair.style.display = "block";

    if (this.game.gameState.getGameStarted()) {
      if (!this.game.renderer.getIsMobile()) {
        this.game.renderer.controls.lock();
      } else if (this.mobileUi) {
        this.mobileUi.style.display = "block";
      }
    }
  }

  public togglePauseMenu() {
    if (this.pauseMenu.style.display === "flex") {
      this.hidePauseMenu();
    } else {
      this.showPauseMenu();
    }
  }
}

