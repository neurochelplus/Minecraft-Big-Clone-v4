# Section: world

## Purpose
- Procedural voxel world generation, chunking, and persistence.
- Runtime chunk streaming and mesh building.

## Key Files
- `src/world/World.ts` manages chunk data, chunk meshes, and saves to IndexedDB.
- `src/world/Environment.ts` controls day/night cycle, lighting, sky colors, sun/moon, and clouds.

## Data Model
- Chunk size: 32^3 blocks stored as `Uint8Array` per chunk key `"cx,cz"`.
- Visual meshes stored separately from chunk data.
- `dirtyChunks` tracks modified chunks for save.

## Generation
- Noise-based terrain height using `simplex-noise`.
- Two-pass generation: terrain, then trees.
- Block IDs defined in `BLOCK` constant.

## Persistence
- Uses `worldDB` (IndexedDB) for `meta` and `chunks`.
- Keeps `knownChunkKeys` to distinguish load vs generate.

## Runtime Update
- Computes active chunk radius (smaller on mobile).
- Loads/generates missing chunks and removes far meshes.
- Periodic memory cleanup by removing farthest chunk data.

## Mesh Building
- Greedy per-block face emission with neighbor checks.
- Handles transparency (air/leaves) to decide face rendering.
- Uses a shared `noiseTexture` atlas for materials.

## Dependencies
- Three.js, `simplex-noise`.
- `worldDB` from `src/utils/DB`.
- Block texture defs from `src/constants/BlockTextures`.
 - Debug controls from `src/utils/DebugUtils` can force day/night.

## Notes
- Vertical world is single-chunk height (0..31) within chunk size.
- Neighbor chunk checks draw faces if neighbor chunk not loaded.
