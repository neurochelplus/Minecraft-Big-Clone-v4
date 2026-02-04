# Section: constants

## Purpose
- Centralized IDs, labels, and texture definitions.

## Key Files
- `src/constants/BlockNames.ts` maps block IDs to localized names and CLI names.
- `src/constants/BlockTextures.ts` defines crafting table patterns and color helpers.
- `src/constants/ToolTextures.ts` generates tool textures and registers them by block ID.
- `src/constants/GameConstants.ts` defines physics and combat constants.

## Notes
- `BLOCK_NAMES` uses Russian labels (file encoding appears non-UTF8 when viewed in PowerShell).
- `ITEM_MAP` provides English CLI identifiers to block IDs.
- Tool textures are generated at runtime on canvas, then stored in `TOOL_TEXTURES`.
