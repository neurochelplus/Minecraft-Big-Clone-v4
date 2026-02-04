# Section: entry

## Purpose

- HTML shell and bootstrapping for the game.
- Defines UI DOM nodes used by UI and gameplay systems.
- Starts the main game initialization pipeline.

## Key Files

- `index.html` provides static DOM for menus, UI HUD, inventory, mobile controls, and registers the service worker.
- `src/main.ts` wires all core systems and starts the game loop.

## Initialization Flow (main.ts)

- Initialize tool textures.
- Create renderer, game state, and detect mobile.
- Create environment, world, player, inventory, UI systems, crafting, mobs, and block systems.
- Create `Game` orchestrator and wire interactions.
- Register global input handlers and UI toggles.
- Start auto-save timer and call `game.start()`.

## DOM Contracts (index.html)

- Menus: `main-menu`, `pause-menu`, `settings-menu`.
- UI HUD: `crosshair`, `hotbar-label`, `health-bar`, `hotbar`, `damage-overlay`.
- Inventory: `inventory-menu`, `inventory-grid`, `drag-icon`, `tooltip`.
- Mobile: `mobile-ui`, joystick, action buttons.

## Dependencies

- Three.js (Renderer, lights).
- Core systems: World, Player, Inventory, Crafting, Mobs, Blocks, UI.

## Notes

- Entry wiring is centralized in `main.ts`, which creates most systems directly.
- Input handling and UI toggling are also centralized here.
