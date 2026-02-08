import type { MenusContext } from "./types";
import { resolveSelectedWorldId } from "./worldList";

type RefreshWorldsOptions = {
  context: MenusContext;
  preferredWorldId?: string;
  renderWorldRows(worldIdToFocus?: string): void;
  updateActionState(): void;
};

type CreateWorldOptions = {
  context: MenusContext;
  parseSeed(): number | undefined;
  closeCreateDialog(): void;
  refreshWorlds(preferredWorldId?: string): Promise<void>;
  startGame(worldId: string): Promise<void>;
  updateActionState(): void;
  setCreateDialogControlsDisabled(disabled: boolean): void;
};

type PlayWorldOptions = {
  context: MenusContext;
  startGame(worldId: string): Promise<void>;
  updateActionState(): void;
};

type DeleteWorldOptions = {
  context: MenusContext;
  refreshWorlds(preferredWorldId?: string): Promise<void>;
  updateActionState(): void;
};

export function parseCreateSeed(rawSeed: string): number | undefined {
  if (!rawSeed) {
    return undefined;
  }

  const parsed = Number(rawSeed);
  if (!Number.isFinite(parsed)) {
    alert("Некорректный сид. Будет использован случайный.");
    return undefined;
  }

  const normalized = Math.floor(parsed);
  if (normalized < 0 || normalized > 0xffffffff) {
    alert("Сид вне диапазона (0..4294967295). Будет использован случайный.");
    return undefined;
  }

  return normalized >>> 0;
}

export async function refreshWorlds(options: RefreshWorldsOptions): Promise<void> {
  const { context, preferredWorldId, renderWorldRows, updateActionState } = options;
  const { game, state } = context;

  try {
    const worlds = await game.world.listWorlds();
    const activeWorldId = await game.world.getActiveWorldId();

    state.storageErrorNotified = false;
    state.worldsCache = worlds;
    state.hasWorlds = worlds.length > 0;
    state.selectedWorldId = resolveSelectedWorldId(
      worlds,
      state.selectedWorldId,
      preferredWorldId,
      activeWorldId,
    );

    renderWorldRows();
    updateActionState();
  } catch (error) {
    state.worldsCache = [];
    state.hasWorlds = false;
    state.selectedWorldId = null;

    renderWorldRows();
    updateActionState();

    console.error("Failed to refresh worlds", error);
    if (!state.storageErrorNotified) {
      state.storageErrorNotified = true;
      alert("Не удалось открыть сохранения. Проверьте доступ к IndexedDB.");
    }
  }
}

export async function handleCreateWorld(options: CreateWorldOptions): Promise<void> {
  const {
    context,
    parseSeed,
    closeCreateDialog,
    refreshWorlds: refresh,
    startGame,
    updateActionState,
    setCreateDialogControlsDisabled,
  } = options;
  const { game, state, dom } = context;

  if (state.worldOperationInProgress) {
    return;
  }

  state.worldOperationInProgress = true;
  updateActionState();
  setCreateDialogControlsDisabled(true);

  try {
    const name = dom.createWorldNameInput.value.trim();
    const seed = parseSeed();

    const world = await game.world.createWorld({ name, seed });
    await game.world.setActiveWorld(world.id);
    closeCreateDialog();
    await refresh(world.id);
    await startGame(world.id);
  } catch (error) {
    console.error("Failed to create world", error);
    alert(`Не удалось создать мир: ${String(error)}`);
  } finally {
    state.worldOperationInProgress = false;
    setCreateDialogControlsDisabled(false);
    updateActionState();
  }
}

export async function handlePlayWorld(options: PlayWorldOptions): Promise<void> {
  const { context, startGame, updateActionState } = options;
  const { game, state } = context;

  if (state.worldOperationInProgress) {
    return;
  }

  if (!state.selectedWorldId) {
    updateActionState();
    return;
  }

  state.worldOperationInProgress = true;
  updateActionState();

  try {
    await game.world.setActiveWorld(state.selectedWorldId);
    await startGame(state.selectedWorldId);
  } catch (error) {
    console.error("Failed to continue world", error);
    alert(`Не удалось загрузить мир: ${String(error)}`);
  } finally {
    state.worldOperationInProgress = false;
    updateActionState();
  }
}

export async function handleDeleteWorld(options: DeleteWorldOptions): Promise<void> {
  const { context, refreshWorlds: refresh, updateActionState } = options;
  const { game, state } = context;

  if (state.worldOperationInProgress || !state.selectedWorldId) {
    return;
  }

  const world = state.worldsCache.find((item) => item.id === state.selectedWorldId);
  const worldName = world?.name ?? "выбранный мир";

  const confirmed = window.confirm(
    `Удалить мир "${worldName}"? Это действие нельзя отменить.`,
  );
  if (!confirmed) {
    return;
  }

  state.worldOperationInProgress = true;
  updateActionState();

  try {
    const deletedWorldId = state.selectedWorldId;
    await game.world.deleteWorld(deletedWorldId);
    state.selectedWorldId = null;
    await refresh();
  } catch (error) {
    console.error("Failed to delete world", error);
    alert("Не удалось удалить мир.");
  } finally {
    state.worldOperationInProgress = false;
    updateActionState();
  }
}
