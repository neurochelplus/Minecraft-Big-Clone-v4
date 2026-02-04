# Section: mobile

## Purpose
- Touch controls for movement, camera look, and actions.

## Key Files
- `src/mobile/MobileControls.ts` implements joystick, buttons, and touch look.

## Behavior
- Virtual joystick drives movement flags on `playerPhysics`.
- Attack button triggers mining/attack and allows drag-look while held.
- Look touch rotates camera with clamped pitch.
- Inventory/menu buttons dispatch global events for handlers in `main.ts`.

## Dependencies
- `Game` for access to renderer, physics, combat, and block interaction.

## Notes
- Directly touches `game.playerPhysics`, `game.playerHand`, and `game.playerCombat` fields.
