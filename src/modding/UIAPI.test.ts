// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { UIAPI } from './UIAPI';

describe('UIAPI Security', () => {
  let ui: UIAPI;

  beforeEach(() => {
    ui = new UIAPI('test-mod');
    document.body.innerHTML = '';
  });

  it('should sanitize basic XSS', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const id = ui.addHUDElement('test1', { html: malicious, position: 'top-left' });
    const element = document.getElementById(id);
    expect(element?.innerHTML).not.toContain('onerror');
    expect(element?.innerHTML).not.toContain('alert(1)');
  });

  it('should sanitize javascript href', () => {
    const malicious = '<a href="javascript:alert(1)">Click me</a>';
    const id = ui.addHUDElement('test2', { html: malicious, position: 'top-left' });
    const element = document.getElementById(id);
    const link = element?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });

  it('should sanitize dangerous tags', () => {
    const tags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'];
    tags.forEach((tag, index) => {
      const malicious = `<${tag}>alert(1)</${tag}>`;
      const id = ui.addHUDElement(`tag-${index}`, { html: malicious, position: 'top-left' });
      const element = document.getElementById(id);
      expect(element?.innerHTML).not.toContain(`<${tag}`);
    });
  });

  // These tests are expected to FAIL before the fix
  it('should sanitize form action', () => {
    const malicious = '<form action="javascript:alert(1)"><button>Submit</button></form>';
    const id = ui.addHUDElement('form-test', { html: malicious, position: 'top-left' });
    const element = document.getElementById(id);
    const form = element?.querySelector('form');
    // Expect form to be removed or action attribute removed
    // Ideally we remove the form tag itself as it's dangerous
    expect(form).toBeNull();
  });

  it('should sanitize object data', () => {
    const malicious = '<object data="javascript:alert(1)"></object>';
    const id = ui.addHUDElement('object-test', { html: malicious, position: 'top-left' });
    const element = document.getElementById(id);
    // object is in the dangerous list of the original code, so this might actually pass if implemented correctly
    expect(element?.innerHTML).not.toContain('<object');
  });

  it('should sanitize vbscript', () => {
    const malicious = '<a href="vbscript:alert(1)">Click</a>';
    const id = ui.addHUDElement('vbscript-test', { html: malicious, position: 'top-left' });
    const element = document.getElementById(id);
    const link = element?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });

  it('should sanitize base tag', () => {
    const malicious = '<base href="https://malicious.com">';
    const id = ui.addHUDElement('base-test', { html: malicious, position: 'top-left' });
    const element = document.getElementById(id);
    expect(element?.innerHTML).not.toContain('<base');
  });

  it('should sanitize svg script', () => {
    // SVG itself might be allowed, but scripts inside shouldn't be
    const malicious = '<svg><script>alert(1)</script></svg>';
    const id = ui.addHUDElement('svg-test', { html: malicious, position: 'top-left' });
    const element = document.getElementById(id);
    expect(element?.innerHTML).not.toContain('<script');
  });
});
