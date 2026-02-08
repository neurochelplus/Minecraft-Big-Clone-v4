import type { WorldSummary } from "../../contracts/world";

type RenderWorldListOptions = {
  worldList: HTMLElement;
  worlds: WorldSummary[];
  selectedWorldId: string | null;
  onSelect(worldId: string): void;
  onActivate(): void;
};

export function renderWorldList(options: RenderWorldListOptions): void {
  const { worldList, worlds, selectedWorldId, onSelect, onActivate } = options;

  worldList.innerHTML = "";

  if (worlds.length === 0) {
    return;
  }

  for (const world of worlds) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "world-row";
    row.dataset.worldId = world.id;
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(world.id === selectedWorldId));

    if (world.id === selectedWorldId) {
      row.classList.add("selected");
    }

    const name = document.createElement("span");
    name.className = "world-row__name";
    name.textContent = world.name;

    const meta = document.createElement("span");
    meta.className = "world-row__meta";
    meta.textContent = `сид ${world.seed}`;

    row.append(name, meta);

    row.addEventListener("click", () => onSelect(world.id));
    row.addEventListener("dblclick", () => onActivate());

    worldList.appendChild(row);
  }
}

export function resolveSelectedWorldId(
  worlds: WorldSummary[],
  currentSelectedWorldId: string | null,
  preferredWorldId: string | undefined,
  activeWorldId: string | null,
): string | null {
  const ids = new Set(worlds.map((world) => world.id));

  if (preferredWorldId && ids.has(preferredWorldId)) {
    return preferredWorldId;
  }
  if (currentSelectedWorldId && ids.has(currentSelectedWorldId)) {
    return currentSelectedWorldId;
  }
  if (activeWorldId && ids.has(activeWorldId)) {
    return activeWorldId;
  }

  return worlds[0]?.id ?? null;
}

export function getRelativeWorldId(
  worlds: WorldSummary[],
  selectedWorldId: string | null,
  direction: 1 | -1,
): string | null {
  if (worlds.length === 0) {
    return null;
  }

  const currentIndex = worlds.findIndex((world) => world.id === selectedWorldId);
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = Math.min(worlds.length - 1, Math.max(0, startIndex + direction));

  return worlds[nextIndex].id;
}
