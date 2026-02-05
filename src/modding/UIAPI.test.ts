import { describe, it, expect, beforeEach } from 'vitest';
import { UIAPI } from './UIAPI';

// @vitest-environment jsdom

describe('UIAPI Security', () => {
  let uiApi: UIAPI;

  beforeEach(() => {
    uiApi = new UIAPI('test-mod');
    // Clear body
    document.body.innerHTML = '';
  });

  const sanitize = (html: string): string => {
    const id = 'test-elem';
    uiApi.addHUDElement(id, { position: 'top-left', html });
    const el = document.getElementById(`mod_test-mod_${id}`);
    return el ? el.innerHTML : '';
  };

  it('should remove script tags', () => {
    const input = '<div>Safe</div><script>alert(1)</script>';
    const output = sanitize(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('Safe');
  });

  it('should remove inline event handlers', () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    const output = sanitize(input);
    expect(output).not.toContain('onclick');
    expect(output).toContain('Click me');
  });

  it('should remove javascript: href', () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    const output = sanitize(input);
    expect(output).not.toContain('javascript:');
    expect(output).toContain('Link');
  });

  // Tests for missing security features

  it('should remove form tags', () => {
    const input = '<form action="http://evil.com"><input type="text"></form>';
    const output = sanitize(input);
    expect(output).not.toContain('<form');
  });

  it('should remove base tags', () => {
    const input = '<base href="http://evil.com/">';
    const output = sanitize(input);
    expect(output).not.toContain('<base');
  });

  it('should remove vbscript: href', () => {
    const input = '<a href="vbscript:alert(1)">Link</a>';
    const output = sanitize(input);
    expect(output).not.toContain('vbscript:');
  });

  it('should remove data: href', () => {
    const input = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Link</a>';
    const output = sanitize(input);
    expect(output).not.toContain('data:');
  });

   it('should remove file: href', () => {
    const input = '<a href="file:///etc/passwd">Link</a>';
    const output = sanitize(input);
    expect(output).not.toContain('file:');
  });

  it('should remove action attribute', () => {
      const input = '<div action="javascript:alert(1)"></div>';
      const output = sanitize(input);
      expect(output).not.toContain('action=');
  });

  it('should remove formaction attribute', () => {
      const input = '<button formaction="javascript:alert(1)">Click</button>';
      const output = sanitize(input);
      expect(output).not.toContain('formaction=');
  });

  it('should remove template tags', () => {
      const input = '<template><div></div></template>';
      const output = sanitize(input);
      expect(output).not.toContain('<template');
  });
});
