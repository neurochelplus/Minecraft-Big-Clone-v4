import type { MenusButtons, MenusDomElements, MenusSettings } from "./types";

function getRequiredElement<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function getMenusDomElements(): MenusDomElements {
  return {
    mainMenu: getRequiredElement("main-menu"),
    pauseMenu: getRequiredElement("pause-menu"),
    settingsMenu: getRequiredElement("settings-menu"),
    inventoryMenu: getRequiredElement("inventory-menu"),
    uiContainer: getRequiredElement("ui-container"),
    mobileUi: document.getElementById("mobile-ui"),
    bgVideo: getRequiredElement<HTMLVideoElement>("bg-video"),
    crosshair: getRequiredElement("crosshair"),
  };
}

export function getMenusButtons(): MenusButtons {
  return {
    btnNewGame: getRequiredElement("btn-new-game"),
    btnContinue: getRequiredElement("btn-play-world"),
    btnResume: getRequiredElement("btn-resume"),
    btnExit: getRequiredElement("btn-exit"),
    btnSettingsMain: getRequiredElement("btn-settings-main"),
    btnSettingsPause: getRequiredElement("btn-settings-pause"),
    btnBackSettings: getRequiredElement("btn-back-settings"),
  };
}

export function getMenusSettings(): MenusSettings {
  return {
    cbShadows: getRequiredElement("cb-shadows"),
    cbClouds: getRequiredElement("cb-clouds"),
  };
}
