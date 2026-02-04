# Findings & Decisions

## Requirements

- Prepare baseline linting and TypeScript checks.
- Add npm scripts to run checks.
- Minimal changes, no behavior changes.
- Create a commit that contains only test-related setup (lint/typecheck).
- Deep research each project section; one file per section.
- Commit current local state to align fork with workspace.

## Research Findings

- Project: Vite + TypeScript, `type: module` (package.json).
- Dependencies: `three`, `simplex-noise`, `@types/three`.
- No ESLint/test runner/scripts for `lint` or `typecheck`.
- `tsconfig.json` is strict with `noEmit: true`.
- `.gitignore` change adds `.codex-planning/` (not test-related).
- `.codex-planning` is ignored and requires force-add to commit.

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| ESLint flat config | Works with ESM and modern ESLint; minimal setup. |
| `typecheck`: `tsc --noEmit` | Simple type validation without build. |
| Relax `no-explicit-any`/`no-case-declarations` | Existing code uses `any` and switch-case declarations; avoid refactors now. |
| Section docs in `.codex-planning/sections` | Keep research close to planning files and out of git. |
| File naming: `section-<name>.md` | Consistent and easy to scan/sort. |

## Issues Encountered

| Issue | Resolution |
|-------|------------|

## Resources

- package.json, tsconfig.json
