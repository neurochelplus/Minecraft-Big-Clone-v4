# Section: utils

## Purpose
- Cross-cutting helpers for persistence and debugging.

## Key Files
- `src/utils/DebugUtils.ts` adds debug hotkeys for day/night cycle control.
- `src/utils/BlockColors.ts` maps block IDs to UI color values.
- `src/utils/DB.ts` wraps IndexedDB for world persistence.

## Notes
- Debug shortcuts are global key listeners and run regardless of game state.
- DB creates `chunks` and `meta` stores and exposes basic CRUD.
