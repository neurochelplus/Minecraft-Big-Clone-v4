## 2025-02-18 - XSS in UIAPI via Blacklist Bypass
**Vulnerability:** `UIAPI.ts` used a limited blacklist for HTML sanitization, allowing dangerous tags like `<form>`, `<svg>`, `<math>` and obfuscated protocols (e.g. `java script:` in `href`).
**Learning:** Blacklists are inherently fragile because HTML is complex and browsers are lenient. Obfuscation (whitespace in protocols) can easily bypass simple string matching.
**Prevention:** Use a strict allow-list (whitelist) approach for tags and attributes whenever possible. When checking protocols, always normalize input (strip control chars/whitespace/casing) before validation.
