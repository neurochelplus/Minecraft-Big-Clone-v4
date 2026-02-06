import { hidePauseMenuView, showPauseMenuView } from "./visibility";
import type { MenusContext } from "./types";

const RESUME_TEXT = "Продолжить";
const RESUME_WAIT_TEXT = "Подождите...";
const RESUME_COOLDOWN_MS = 1300;

type PauseFlowActions = {
  hideSettingsMenu(): void;
  hidePauseMenu(): void;
  showPauseMenu(): void;
};

function resetResumeButton(button: HTMLButtonElement): void {
  button.style.pointerEvents = "auto";
  button.style.opacity = "1";
  button.innerText = RESUME_TEXT;
}

export function showPauseFlow(context: MenusContext): void {
  const { game, buttons, state, dom } = context;

  showPauseMenuView(context);

  if (game.gameState.getGameStarted()) {
    void game.saveCoordinator?.requestSave("pause");
  }

  if (game.renderer.getIsMobile()) {
    return;
  }

  if (state.resumeTimeout !== null) {
    clearTimeout(state.resumeTimeout);
  }

  buttons.btnResume.style.pointerEvents = "none";
  buttons.btnResume.style.opacity = "0.5";
  buttons.btnResume.innerText = RESUME_WAIT_TEXT;

  state.resumeTimeout = window.setTimeout(() => {
    if (dom.pauseMenu.style.display === "flex") {
      resetResumeButton(buttons.btnResume);
    }
    state.resumeTimeout = null;
  }, RESUME_COOLDOWN_MS);
}

export function hidePauseFlow(context: MenusContext): void {
  const { state, buttons, game } = context;

  hidePauseMenuView(context);

  if (state.resumeTimeout !== null) {
    clearTimeout(state.resumeTimeout);
    state.resumeTimeout = null;
  }

  if (!game.renderer.getIsMobile()) {
    resetResumeButton(buttons.btnResume);
  }
}

export function togglePauseFlow(
  context: MenusContext,
  actions: PauseFlowActions,
): void {
  if (!context.game.gameState.getGameStarted()) {
    return;
  }

  if (context.dom.settingsMenu.style.display === "flex") {
    actions.hideSettingsMenu();
    return;
  }

  if (context.game.gameState.getPaused()) {
    actions.hidePauseMenu();
    return;
  }

  actions.showPauseMenu();
}
