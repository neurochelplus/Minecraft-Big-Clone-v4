# Section: config

## Purpose
- Build tooling, scripts, TypeScript configuration, and linting.

## Key Files
- `package.json` defines Vite scripts and lint/typecheck commands.
- `tsconfig.json` defines strict TypeScript settings and bundler module resolution.
- `eslint.config.js` configures ESLint flat config.

## Tooling
- Dev/build/preview via Vite.
- Lint via `eslint .`.
- Typecheck via `tsc --noEmit`.

## Notes
- `typecheck` currently fails due to existing TS errors in codebase.
