# Section: crafting

## Purpose
- Crafting logic (shaped/shapeless) and UI for desktop/mobile.

## Key Files
- `src/crafting/CraftingSystem.ts` evaluates recipes and consumes inputs.
- `src/crafting/CraftingUI.ts` renders crafting grid/result and mobile recipe list.
- `src/crafting/Recipes.ts` defines recipe data.

## Crafting Logic
- Supports 2x2 (inventory) and 3x3 (crafting table) grids.
- Normalizes recipe bounds for shaped matching.
- Supports shapeless recipes by ingredient counts.
- Recipes include planks, sticks, crafting table, and wooden/stone tools.

## UI Behavior
- Desktop grid with drag/drop logic and result slot.
- Mobile list filters recipes by inventory availability.
- `setVisible` toggles grid vs mobile list and configures grid size.

## Dependencies
- Inventory, DragDrop, Tool textures, Block colors.
- Uses DOM nodes under `#inventory-menu`.

## Notes
- Mobile crafting uses simplified recipe matching and direct inventory consumption.
