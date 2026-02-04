# Section: player

## Purpose
- Player entity: physics, health, combat, and hand rendering.

## Key Files
- `src/player/Player.ts` composes physics, health, combat, and hand.
- `src/player/PlayerPhysics.ts` handles movement, gravity, and collision.
- `src/player/PlayerHealth.ts` handles damage, respawn, and UI effects.
- `src/player/PlayerCombat.ts` handles attacks and hit detection.
- `src/player/PlayerHand.ts` renders hand/item in UI scene.

## Physics
- Uses simple acceleration + friction model with gravity.
- AABB collision against voxel blocks via `World.hasBlock`.
- Teleports player if falling below Y=-50.

## Composition
- `Player` updates physics and hand animation per frame.
- Health and combat use camera/controls and world context.
## Hand Rendering
- `PlayerHand` attaches a mesh group to the UI camera.
- Generates tool meshes from pixel patterns and renders blocks with atlas UVs.
- Handles swing/bob animations and looping mining motion.
## Health
- Damage triggers screen flash and small camera shake.
- Invulnerability window: 500 ms.
- Respawn teleports to fixed position and resets HP.
## Combat
- Raycast-based melee within `ATTACK_RANGE`.
- Damage is based on selected tool id.
- Ignores cursor/crack meshes and items; targets mobs via `userData.mob`.

## Dependencies
- `World`, `HealthBar`, `PointerLockControls`, Three.js.

## Notes
- `Player` constructor accepts `toolTextures` as `any`.
