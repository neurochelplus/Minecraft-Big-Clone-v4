import type { IGameRuntime } from "../contracts/game";
import { worldDB } from "../utils/DB";
import type { IStorage } from "../contracts/storage";
import { LoadingScreen } from "./LoadingScreen";
import {
  bindSettingsListeners,
  createMenuMusic,
  getMenusButtons,
  getMenusDomElements,
  getMenusSettings,
  hidePauseMenuView,
  hideSettingsMenuView,
  showMainMenuView,
  showPauseMenuView,
  showSettingsMenuView,
  startGameFlow,
} from "./menus/index";
import type { MenusDependencies } from "./menus/index";

export class Menus {
  private game: IGameRuntime;
  private storage: IStorage = worldDB;

  private deps: MenusDependencies;
  private menuMusic: HTMLAudioElement;
  private worldLoading: LoadingScreen;

  private btnNewGame: HTMLElement;
  private btnContinue: HTMLButtonElement;
  private btnResume: HTMLElement;
  private btnExit: HTMLElement;
  private btnSettingsMain: HTMLElement;
  private btnSettingsPause: HTMLElement;
  private btnBackSettings: HTMLElement;

  constructor(game: IGameRuntime) {
    this.game = game;
    const dom = getMenusDomElements();
    const buttons = getMenusButtons();
    const settings = getMenusSettings();
    this.worldLoading = new LoadingScreen({
      screenId: "world-loading-screen",
      barInnerId: "world-loading-bar-inner",
      progressTextId: "world-loading-progress-text",
    });

    this.menuMusic = createMenuMusic(dom.mainMenu);
    this.deps = {
      game: this.game,
      storage: this.storage,
      dom,
      btnSettingsMain: buttons.btnSettingsMain,
    };

    this.btnNewGame = buttons.btnNewGame;
    this.btnContinue = buttons.btnContinue;
    this.btnResume = buttons.btnResume;
    this.btnExit = buttons.btnExit;
    this.btnSettingsMain = buttons.btnSettingsMain;
    this.btnSettingsPause = buttons.btnSettingsPause;
    this.btnBackSettings = buttons.btnBackSettings;

    this.btnContinue.disabled = true;
    void this.checkSaveState();
    bindSettingsListeners(this.game, settings);
    this.initListeners();
  }

  private async checkSaveState() {
    const hasSave = await this.storage.hasSavedData();
    this.btnContinue.disabled = !hasSave;
  }

  private initListeners() {
    this.btnNewGame.addEventListener("click", () => void this.startGame(false));
    this.btnContinue.addEventListener("click", () => void this.startGame(true));
    this.btnResume.addEventListener("click", () => {
      if (this.game.renderer.getIsMobile()) {
        this.hidePauseMenu();
      } else {
        this.game.gameState.setIsResuming(true);
        document.body.focus();
        this.game.renderer.controls.lock();

        setTimeout(() => {
          this.game.gameState.setIsResuming(false);
        }, 1000);
      }
    });
    this.btnSettingsMain.addEventListener("click", () =>
      this.showSettingsMenu(this.deps.dom.mainMenu),
    );
    this.btnSettingsPause.addEventListener("click", () =>
      this.showSettingsMenu(this.deps.dom.pauseMenu),
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
    void this.checkSaveState();
    showMainMenuView(this.deps);
  }

  public showPauseMenu() {
    showPauseMenuView(this.deps);
  }

  private showSettingsMenu(parent: HTMLElement) {
    showSettingsMenuView(this.deps, parent);
  }

  private hideSettingsMenu() {
    hideSettingsMenuView(this.deps);
  }

  public async startGame(loadSave: boolean) {
    await startGameFlow({
      game: this.game,
      loadSave,
      dom: this.deps.dom,
      menuMusic: this.menuMusic,
      worldLoading: this.worldLoading,
    });
  }

  public hidePauseMenu() {
    hidePauseMenuView(this.deps);
  }

  public togglePauseMenu() {
    if (this.deps.dom.pauseMenu.style.display === "flex") {
      this.hidePauseMenu();
    } else {
      this.showPauseMenu();
    }
  }
}
