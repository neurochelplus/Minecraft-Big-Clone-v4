// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UIAPI } from './UIAPI';

describe('UIAPI Security', () => {
  let api: UIAPI;

  beforeEach(() => {
    api = new UIAPI('test_mod');
    document.body.innerHTML = '';
  });

  afterEach(() => {
    api._cleanup();
    document.body.innerHTML = '';
  });

  it('should remove script tags', () => {
    const html = '<div>Safe</div><script>alert(1)</script>';
    api.addHUDElement('test1', { html, position: 'top-left' });

    const el = document.getElementById('mod_test_mod_test1');
    expect(el?.innerHTML).not.toContain('<script>');
    expect(el?.textContent).toContain('Safe');
  });

  it('should remove inline event handlers', () => {
    const html = '<button onclick="alert(1)">Click</button>';
    api.addHUDElement('test2', { html, position: 'top-left' });

    const el = document.getElementById('mod_test_mod_test2');
    const btn = el?.querySelector('button');
    expect(btn?.hasAttribute('onclick')).toBe(false);
  });

  it('should remove javascript: protocol in href', () => {
    const html = '<a href="javascript:alert(1)">Link</a>';
    api.addHUDElement('test3', { html, position: 'top-left' });

    const el = document.getElementById('mod_test_mod_test3');
    const link = el?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });

  // VULNERABILITY REPRODUCTION TESTS

  it('should remove javascript: protocol with whitespace (reproduction)', () => {
    const html = '<a href="j a v a s c r i p t:alert(1)">Link</a>';
    api.addHUDElement('test4', { html, position: 'top-left' });

    const el = document.getElementById('mod_test_mod_test4');
    const link = el?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });

  it('should remove svg tags (reproduction)', () => {
    const html = '<svg onload="alert(1)"></svg>';
    api.addHUDElement('test5', { html, position: 'top-left' });

    const el = document.getElementById('mod_test_mod_test5');
    // If svg is allowed, it will be present. We want it removed.
    expect(el?.innerHTML).not.toContain('<svg');
  });

  it('should remove form tags (reproduction)', () => {
    const html = '<form action="javascript:alert(1)"><input></form>';
    api.addHUDElement('test6', { html, position: 'top-left' });

    const el = document.getElementById('mod_test_mod_test6');
    expect(el?.innerHTML).not.toContain('<form');
  });

  it('should remove formaction attribute (reproduction)', () => {
    const html = '<button formaction="javascript:alert(1)">Submit</button>';
    api.addHUDElement('test7', { html, position: 'top-left' });

    const el = document.getElementById('mod_test_mod_test7');
    const btn = el?.querySelector('button');
    expect(btn?.hasAttribute('formaction')).toBe(false);
  });

  it('should remove data: protocol (reproduction)', () => {
    const html = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
    api.addHUDElement('test8', { html, position: 'top-left' });

    const el = document.getElementById('mod_test_mod_test8');
    const link = el?.querySelector('a');
    expect(link?.hasAttribute('href')).toBe(false);
  });
});
