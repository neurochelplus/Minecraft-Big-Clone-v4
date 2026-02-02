## 2024-05-22 - Manual HTML Sanitization Risks
**Vulnerability:** Incomplete deny-list in manual HTML sanitizer allowed XSS via `form` actions, `data:` URIs, and whitespace obfuscation.
**Learning:** Manual sanitization using deny-lists is fragile and often misses vectors like legacy protocols (`vbscript:`), valid-but-dangerous tags (`form`, `base`), and obfuscation techniques.
**Prevention:** Use established sanitization libraries like DOMPurify when possible. If dependencies are restricted, use an allow-list approach (allow only known-safe tags/attributes) rather than a deny-list.
