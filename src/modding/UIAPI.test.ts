
import { describe, it, expect } from 'vitest';
import { UIAPI } from './UIAPI';

// @vitest-environment jsdom

describe('UIAPI Sanitization', () => {
  const ui = new UIAPI('test_mod');

  // Access private method for testing
  const sanitize = (html: string) => {
    return (ui as any).sanitizeHTML(html);
  };

  it('removes script tags', () => {
    const input = '<div><script>alert(1)</script></div>';
    expect(sanitize(input)).toBe('<div></div>');
  });

  it('removes on* attributes', () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    const output = sanitize(input);
    expect(output).not.toContain('onclick');
    expect(output).toContain('Click me');
  });

  it('removes javascript: href', () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    const output = sanitize(input);
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('href');
  });

  it('SHOULD remove javascript: in other attributes (formaction)', () => {
    const input = '<button formaction="javascript:alert(1)">Click</button>';
    const output = sanitize(input);
    expect(output).not.toContain('javascript:');
  });

  it('SHOULD remove data: protocol', () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
    const output = sanitize(input);
    expect(output).not.toContain('data:');
  });

  it('SHOULD remove vbscript: protocol', () => {
    const input = '<a href="vbscript:alert(1)">Link</a>';
    const output = sanitize(input);
    expect(output).not.toContain('vbscript:');
  });

  it('SHOULD remove base tag', () => {
      const input = '<base href="http://attacker.com">';
      const output = sanitize(input);
      expect(output).not.toContain('<base');
  });

  it('SHOULD remove form tag', () => {
      const input = '<form action="http://attacker.com"></form>';
      const output = sanitize(input);
      expect(output).not.toContain('<form');
  });

  it('SHOULD remove whitespace obfuscated javascript:', () => {
      const input = '<a href="java script:alert(1)">Link</a>';
      const output = sanitize(input);
      expect(output).not.toContain('java script:');
  });

  it('SHOULD remove control char obfuscated javascript:', () => {
      const input = '<a href="java\tscript:alert(1)">Link</a>';
      const output = sanitize(input);
      expect(output).not.toContain('script:'); // Just checking part of it is gone or attribute removed
  });

  it('SHOULD remove case-insensitive ObFuScAtEd javascript:', () => {
      const input = '<a href="JaVaScRiPt:alert(1)">Link</a>';
      const output = sanitize(input);
      expect(output).not.toContain('JaVaScRiPt:');
  });

  it('should allow safe HTML', () => {
      const input = '<a href="https://example.com" class="btn">Safe Link</a><img src="image.png" alt="Test">';
      const output = sanitize(input);
      expect(output).toContain('href="https://example.com"');
      expect(output).toContain('class="btn"');
      expect(output).toContain('Safe Link');
      expect(output).toContain('src="image.png"');
      expect(output).toContain('alt="Test"');
  });
});
