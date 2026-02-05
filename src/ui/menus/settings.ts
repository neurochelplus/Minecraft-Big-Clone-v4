import type { IGameRuntime } from "../../contracts/game";
import type { MenusSettings } from "./types";

export function bindSettingsListeners(
  game: IGameRuntime,
  settings: MenusSettings,
): void {
  settings.cbShadows.addEventListener("change", () => {
    game.environment.setShadowsEnabled(settings.cbShadows.checked);
  });

  settings.cbClouds.addEventListener("change", () => {
    game.environment.setCloudsEnabled(settings.cbClouds.checked);
  });
}
