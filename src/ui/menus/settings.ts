import type { MenusSettings } from "./types";

type SettingsGame = {
  environment: {
    setShadowsEnabled(enabled: boolean): void;
    setCloudsEnabled(enabled: boolean): void;
  };
};

export function bindSettingsListeners(
  game: SettingsGame,
  settings: MenusSettings,
): void {
  settings.cbShadows.addEventListener("change", () => {
    game.environment.setShadowsEnabled(settings.cbShadows.checked);
  });

  settings.cbClouds.addEventListener("change", () => {
    game.environment.setCloudsEnabled(settings.cbClouds.checked);
  });
}
