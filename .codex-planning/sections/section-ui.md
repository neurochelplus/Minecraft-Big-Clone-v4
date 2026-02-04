# Section: ui

## Purpose
- Menus, CLI commands, HUD elements.

## Key Files
- `src/ui/CLI.ts` provides in-game command input (e.g., `/give`).
- `src/ui/Menus.ts` controls main/pause/settings menus and start/continue flow.
- `src/ui/HealthBar.ts` renders hearts for player health.
- `src/ui/HotbarLabel.ts` shows item name when hotbar changes.

## CLI
- Creates input overlay and toggles pointer lock.
- Parses `/give` command using `ITEM_MAP` and `BLOCK_NAMES`.
- Writes directly into inventory and refreshes UI.

## Menus
- Orchestrates main/pause/settings visibility and game state flags.
- Handles new game vs continue (load saved world) flows.
- Toggles mobile UI and fullscreen on start.
## HUD Components
- `HealthBar` renders 20 health units and toggles empty state.
- `HotbarLabel` shows item name with 2s fade-out timer.

## Dependencies
- `Game` for accessing world, player, inventory, renderer, and environment.
- DOM nodes from `index.html` for all menu elements.

## Notes
- CLI and menus are tightly coupled to `Game` and DOM elements.
