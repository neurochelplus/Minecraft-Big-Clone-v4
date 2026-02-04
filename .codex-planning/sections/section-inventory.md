# Section: inventory

## Purpose

- Inventory data model and slot management.

## Key Files

- `src/inventory/Inventory.ts` implements inventory slots, selection, add/remove, and serialization.
- `src/inventory/InventoryUI.ts` renders hotbar/inventory DOM and handles slot interactions.
- `src/inventory/DragDrop.ts` handles drag icon and item dragging for mouse/touch.

## Data Model

- 36 total slots, 9 hotbar slots.
- Slot shape: `{ id, count }` with `id = 0` meaning empty.

## Core Operations

- Add items with stacking, fallback to empty slot.
- Remove items with decrement and cleanup.
- Serialize/deserialize to plain arrays for save/load.
- UI logic for split/stack/swap via left/right click and touch.

## Notes

- No stack size limits enforced.
