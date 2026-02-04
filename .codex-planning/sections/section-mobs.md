# Section: mobs

## Purpose
- Mob AI, physics, spawning, and combat interactions.

## Key Files
- `src/mobs/Mob.ts` base class with AI state machine and physics.
- `src/mobs/MobManager.ts` spawns/updates mobs and handles despawn.
- `src/mobs/Zombie.ts` concrete zombie implementation.

## MobManager
- Updates mobs, handles despawn, and drops items on death.
- Spawns mobs at night around player with basic surface checks.

## Mob Base
- AI states: idle/wander/chase/attack/seek shelter (only idle/wander implemented here).
- Basic knockback, hurt flashing, fire damage, and physics.
- Collision uses voxel AABB checks against `World.hasBlock`.
## Zombie
- Builds a voxel-style model with animated limbs.
- Burns in daylight unless under cover, seeks shelter when burning.
- Chases player, performs line-of-sight checks, and attacks with cooldown.

## Dependencies
- `World`, `Environment`, `ItemEntity`, Three.js.

## Notes
- Spawn interval is fixed and capped by `MAX_MOBS`.
- `isMob` is stored on mesh userData for raycast targeting.
