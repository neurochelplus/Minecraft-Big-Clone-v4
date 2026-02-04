# Section: entities

## Purpose
- Dropped item entities with simple physics and lifespan.

## Key Files
- `src/entities/ItemEntity.ts` handles rendering and lifecycle for item drops.

## Behavior
- Items fall with gravity until landing on a block, then float/bob.
- Items despawn after 3 minutes and blink during the last 10 seconds.
- Items can render as 3D blocks or flat tools using a texture.

## Dependencies
- Three.js, `World` for collision against blocks.

## Notes
- Item meshes are tagged with `isItem` for raycast filtering.
