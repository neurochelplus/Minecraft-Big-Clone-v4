
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UIAPI } from './UIAPI';

// @vitest-environment jsdom

describe('UIAPI Sanitization', () => {
  let uiApi: UIAPI;

  beforeEach(() => {
    uiApi = new UIAPI('test-mod');
  });

  afterEach(() => {
    uiApi._cleanup();
    document.body.innerHTML = '';
  });

  it('should remove script tags', () => {
    const html = '<div><script>alert(1)</script>Safe</div>';
    // We can't access private sanitizeHTML directly easily, so we use addHUDElement or updateHUDElement
    // However, sanitizeHTML is private. We can test via addHUDElement.

    uiApi.addHUDElement('test1', { position: 'top-left', html });
    const element = document.getElementById('mod_test-mod_test1');
    expect(element?.innerHTML).not.toContain('<script>');
    expect(element?.textContent).toBe('Safe');
  });

  it('should remove onclick attributes', () => {
    const html = '<button onclick="alert(1)">Click me</button>';
    uiApi.addHUDElement('test2', { position: 'top-left', html });
    const element = document.getElementById('mod_test-mod_test2');
    const button = element?.querySelector('button');
    expect(button?.hasAttribute('onclick')).toBe(false);
  });

  it('should remove javascript: links', () => {
    const html = '<a href="javascript:alert(1)">Link</a>';
    uiApi.addHUDElement('test3', { position: 'top-left', html });
    const element = document.getElementById('mod_test-mod_test3');
    const link = element?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });

  // VULNERABILITY CHECKS

  it('should remove data: links', () => {
    // data:text/html;base64,... can execute script if navigated to
    const html = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2c+">Link</a>';
    uiApi.addHUDElement('test4', { position: 'top-left', html });
    const element = document.getElementById('mod_test-mod_test4');
    const link = element?.querySelector('a');
    // Expectation: it SHOULD be removed for security, but currently it likely isn't.
    // If this assertion fails, it means it's NOT removed (vulnerable).
    expect(link?.hasAttribute('href')).toBe(false);
  });

  it('should remove form actions with javascript:', () => {
    const html = '<form action="javascript:alert(1)"><input type="submit"></form>';
    uiApi.addHUDElement('test5', { position: 'top-left', html });
    const element = document.getElementById('mod_test-mod_test5');
    const form = element?.querySelector('form');
    // Expectation: form should be removed entirely, so form is null
    expect(form).toBeNull();
  });

  it('should remove form tags entirely', () => {
     // Ideally we might want to block forms to prevent phishing/CSRF via mods
     const html = '<form action="https://evil.com/login"><input name="password"></form>';
     uiApi.addHUDElement('test6', { position: 'top-left', html });
     const element = document.getElementById('mod_test-mod_test6');
     // Expectation: form should be removed or sanitized?
     // The current code only lists specific dangerous tags. Form is not one of them.
     expect(element?.querySelector('form')).toBeNull();
  });

});
