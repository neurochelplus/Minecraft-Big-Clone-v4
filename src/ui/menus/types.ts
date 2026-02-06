import type { Game } from "../../core/Game";
import type { WorldSummary } from "../../contracts/world";

export type MenusDomElements = {
  mainMenu: HTMLElement;
  singleplayerMenu: HTMLElement;
  pauseMenu: HTMLElement;
  settingsMenu: HTMLElement;
  inventoryMenu: HTMLElement;
  uiContainer: HTMLElement;
  mobileUi: HTMLElement | null;
  bgVideo: HTMLVideoElement;
  crosshair: HTMLElement;
  worldList: HTMLElement;
  worldEmptyHint: HTMLElement;
  createWorldDialog: HTMLElement;
  createWorldNameInput: HTMLInputElement;
  createWorldSeedInput: HTMLInputElement;
};

export type MenusButtons = {
  btnNewGame: HTMLButtonElement;
  btnPlayWorld: HTMLButtonElement;
  btnCreateWorld: HTMLButtonElement;
  btnDeleteWorld: HTMLButtonElement;
  btnBackSingleplayer: HTMLButtonElement;
  btnMultiplayer: HTMLButtonElement;
  btnMods: HTMLButtonElement;
  btnResume: HTMLButtonElement;
  btnExit: HTMLButtonElement;
  btnSettingsMain: HTMLButtonElement;
  btnSettingsPause: HTMLButtonElement;
  btnBackSettings: HTMLButtonElement;
  btnCreateWorldConfirm: HTMLButtonElement;
  btnCreateWorldCancel: HTMLButtonElement;
};

export type MenusSettings = {
  cbShadows: HTMLInputElement;
  cbClouds: HTMLInputElement;
};

export type MenusState = {
  resumeTimeout: number | null;
  worldOperationInProgress: boolean;
  hasWorlds: boolean;
  storageErrorNotified: boolean;
  worldsCache: WorldSummary[];
  selectedWorldId: string | null;
  isCreateDialogOpen: boolean;
};

export type MenusContext = {
  game: Game;
  dom: MenusDomElements;
  buttons: MenusButtons;
  settings: MenusSettings;
  state: MenusState;
  menuMusic: HTMLAudioElement;
};

export type StartGameOptions = {
  game: Game;
  dom: MenusDomElements;
  buttons: MenusButtons;
  state: MenusState;
  menuMusic: HTMLAudioElement;
  worldId: string;
};
