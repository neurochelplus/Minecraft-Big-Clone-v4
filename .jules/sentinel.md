## 2024-10-24 - [Fragile Sanitization]
**Vulnerability:** XSS bypass possible due to incomplete deny-list in `UIAPI.ts`.
**Learning:** Deny-list approaches (blacklisting) are prone to bypasses. The initial implementation missed `base`, `form`, `svg`, `vbscript:`, `data:`.
**Prevention:** Use a robust allow-list (whitelist) library like DOMPurify, or maintain a strict allow-list of safe tags/attributes if dependencies cannot be added.
