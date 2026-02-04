# Section: core

## Purpose
- Central orchestration and render loop.
- Renderer setup with Three.js + pointer lock.
- Global game lifecycle control.

## Key Files
- `src/core/Renderer.ts` configures scenes, cameras, renderer, controls, resize handling, and render methods.
- `src/core/Game.ts` owns game loop, updates systems, and wires UI/mobiles.
- `src/core/GameState.ts` stores pause/start flags and previous menu state.

## Key Responsibilities
- `Renderer` creates main scene and UI scene, sets camera and fog, and renders both layers.
- `Game` coordinates world updates, player updates, block breaking, entities, mobs, and UI menus/CLI.

## Update Loop
- `Game.start()` shows main menu and starts animation.
- `Game.update()` updates world/environment, player, block breaking, entities pickup, mobs, and cursor.
- `Game.render()` renders via `Renderer`.

## Dependencies
- `World`, `Environment`, `Player`, `MobManager`, `Block*` systems, `Inventory`, `Crafting`, `CLI`, `Menus`.
- Three.js and PointerLockControls.

## Notes
- `Game` holds many direct references to systems, creating tight coupling.
- `Renderer` determines mobile mode by user agent and touch capability.
