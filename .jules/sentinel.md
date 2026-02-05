## 2025-02-19 - Manual HTML Sanitization Risks
**Vulnerability:** XSS bypass via `form`, `base`, `template` tags and `action`, `formaction` attributes in `UIAPI.ts`.
**Learning:** The project relies on a manual blocklist for HTML sanitization, which is fragile and incomplete. It missed several dangerous HTML5 features.
**Prevention:** Avoid manual sanitization. Use established libraries like DOMPurify. If manual is necessary, use an allowlist (whitelist) approach for tags and attributes, not a blocklist.
