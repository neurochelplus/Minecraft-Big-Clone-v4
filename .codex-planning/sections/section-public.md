# Section: public

## Purpose
- PWA metadata and offline caching.

## Key Files
- `public/manifest.json` defines app name, icons, fullscreen display, and theme colors.
- `public/sw.js` registers a service worker that caches app shell and serves from cache on fetch failures.

## Notes
- Cache list includes `/`, `/index.html`, and `/src/style.css` only.
