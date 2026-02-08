import type { MenusButtons, MenusDomElements, MenusSettings } from "./types";

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required menu element: ${id}`);
  }
  return element as T;
}

export function getMenusDomElements(): MenusDomElements {
  return {
    mainMenu: getRequiredElement("main-menu"),
    singleplayerMenu: getRequiredElement("singleplayer-menu"),
    pauseMenu: getRequiredElement("pause-menu"),
    settingsMenu: getRequiredElement("settings-menu"),
    inventoryMenu: getRequiredElement("inventory-menu"),
    uiContainer: getRequiredElement("ui-container"),
    mobileUi: document.getElementById("mobile-ui"),
    bgVideo: getRequiredElement<HTMLVideoElement>("bg-video"),
    crosshair: getRequiredElement("crosshair"),
    worldList: getRequiredElement("world-list"),
    worldEmptyHint: getRequiredElement("world-empty-hint"),
    createWorldDialog: getRequiredElement("create-world-dialog"),
    createWorldNameInput: getRequiredElement<HTMLInputElement>("create-world-name"),
    createWorldSeedInput: getRequiredElement<HTMLInputElement>("create-world-seed"),
    createWorldPresetSelect: getRequiredElement<HTMLSelectElement>("create-world-preset"),
  };
}

export function getMenusButtons(): MenusButtons {
  return {
    btnNewGame: getRequiredElement("btn-new-game"),
    btnPlayWorld: getRequiredElement("btn-play-world"),
    btnCreateWorld: getRequiredElement("btn-create-world"),
    btnDeleteWorld: getRequiredElement("btn-delete-world"),
    btnBackSingleplayer: getRequiredElement("btn-back-singleplayer"),
    btnMultiplayer: getRequiredElement("btn-multiplayer"),
    btnResume: getRequiredElement("btn-resume"),
    btnExit: getRequiredElement("btn-exit"),
    btnSettingsMain: getRequiredElement("btn-settings-main"),
    btnSettingsPause: getRequiredElement("btn-settings-pause"),
    btnBackSettings: getRequiredElement("btn-back-settings"),
    btnCreateWorldConfirm: getRequiredElement("btn-create-world-confirm"),
    btnCreateWorldCancel: getRequiredElement("btn-create-world-cancel"),
  };
}

export function getMenusSettings(): MenusSettings {
  return {
    cbShadows: getRequiredElement("cb-shadows"),
    cbClouds: getRequiredElement("cb-clouds"),
  };
}
