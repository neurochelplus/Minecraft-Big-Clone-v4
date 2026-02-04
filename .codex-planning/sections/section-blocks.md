# Section: blocks

## Purpose
- Player interaction with blocks: selection cursor, breaking, and placement.

## Key Files
- `src/blocks/BlockCursor.ts` handles raycast selection and visual wireframe cursor.
- `src/blocks/BlockBreaking.ts` handles mining progress and crack overlay.
- `src/blocks/BlockInteraction.ts` handles right-click interactions and block placement.

## Block Cursor
- Raycasts from camera into scene.
- Filters out player controls, items, and mob meshes.
- Shows wireframe cube on valid block within max distance.

## Block Breaking
- Creates a 10-frame crack texture atlas on a canvas.
- Tracks current target block and mining time.
- Uses tool id to adjust break duration via `World.getBreakTime`.
- Fires `onBlockBreak` callback on completion.
## Block Interaction
- Raycasts to detect targeted block.
- Opens crafting table UI when targeting `BLOCK.CRAFTING_TABLE`.
- Places blocks adjacent to hit face, with player collision checks.
- Filters out tools/sticks from being placed.

## Dependencies
- Three.js, camera, PointerLockControls.
- `World` for block data and break time.

## Notes
- Uses `any` for controls and world in cursor.
- Crack mesh is rendered at high priority with polygon offset.
