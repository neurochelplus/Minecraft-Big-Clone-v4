import type { MenusContext } from "./types";

export function updateSingleplayerActionState(context: MenusContext): void {
  const { state, dom, buttons } = context;

  const hasSelection = state.selectedWorldId !== null;
  const controlsLocked = state.worldOperationInProgress || state.isCreateDialogOpen;

  buttons.btnPlayWorld.disabled = controlsLocked || !hasSelection;
  buttons.btnDeleteWorld.disabled = controlsLocked || !hasSelection;
  buttons.btnCreateWorld.disabled = state.worldOperationInProgress || state.isCreateDialogOpen;
  buttons.btnBackSingleplayer.disabled = state.worldOperationInProgress;

  const rows = dom.worldList.querySelectorAll<HTMLButtonElement>(".world-row");
  rows.forEach((row) => {
    row.disabled = controlsLocked;
  });

  dom.worldList.classList.toggle("world-list--disabled", controlsLocked);
  dom.worldEmptyHint.style.display = state.hasWorlds ? "none" : "block";
}

export function setCreateDialogControlsDisabled(
  context: MenusContext,
  disabled: boolean,
): void {
  const { dom, buttons } = context;
  dom.createWorldNameInput.disabled = disabled;
  dom.createWorldSeedInput.disabled = disabled;
  dom.createWorldPresetSelect.disabled = disabled;
  buttons.btnCreateWorldConfirm.disabled = disabled;
  buttons.btnCreateWorldCancel.disabled = disabled;
}
