## 2024-05-23 - [Incomplete Manual HTML Sanitization]
**Vulnerability:** The `UIAPI.ts` module used a manual allow-list/block-list approach for HTML sanitization that missed several dangerous tags (`form`, `base`, `object`) and protocols (`data:`, `vbscript:`).
**Learning:** Manual sanitization is prone to errors and bypasses. The initial implementation focused only on obvious vectors like `script` and `on*` events, missing nuanced attacks like phishing forms or `data:` URI payloads.
**Prevention:** Avoid manual sanitization where possible. If dependencies are restricted, maintain a strict deny-list that covers all executable contexts (href, src, action, data) and dangerous elements, not just the most common ones.
