import type { IGameRuntime } from "../../contracts/game";
import type { IStorage } from "../../contracts/storage";
import type { LoadingScreen } from "../LoadingScreen";

export type MenusDomElements = {
  mainMenu: HTMLElement;
  pauseMenu: HTMLElement;
  settingsMenu: HTMLElement;
  inventoryMenu: HTMLElement;
  uiContainer: HTMLElement;
  mobileUi: HTMLElement | null;
  bgVideo: HTMLVideoElement;
  crosshair: HTMLElement;
};

export type MenusButtons = {
  btnNewGame: HTMLElement;
  btnContinue: HTMLButtonElement;
  btnResume: HTMLElement;
  btnExit: HTMLElement;
  btnSettingsMain: HTMLElement;
  btnSettingsPause: HTMLElement;
  btnBackSettings: HTMLElement;
};

export type MenusSettings = {
  cbShadows: HTMLInputElement;
  cbClouds: HTMLInputElement;
};

export type StartGameOptions = {
  game: IGameRuntime;
  loadSave: boolean;
  dom: MenusDomElements;
  menuMusic: HTMLAudioElement;
  worldLoading: LoadingScreen;
};

export type MenusDependencies = {
  game: IGameRuntime;
  storage: IStorage;
  dom: MenusDomElements;
  btnSettingsMain: HTMLElement;
};
