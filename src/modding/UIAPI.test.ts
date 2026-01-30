// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UIAPI } from './UIAPI';

describe('UIAPI Security', () => {
  let ui: UIAPI;

  beforeEach(() => {
    ui = new UIAPI('test_mod');
    document.body.innerHTML = '';
  });

  afterEach(() => {
    ui._cleanup();
    document.body.innerHTML = '';
  });

  it('should block javascript: in href', () => {
    const id = ui.addHUDElement('xss_js_href', {
      position: 'top-left',
      html: '<a href="javascript:alert(1)">Click me</a>'
    });
    const el = document.getElementById(id);
    const a = el?.querySelector('a');
    expect(a?.hasAttribute('href')).toBe(false);
  });

  it('should block javascript: in src', () => {
    const id = ui.addHUDElement('xss_js_src', {
      position: 'top-left',
      html: '<img src="javascript:alert(1)">'
    });
    const el = document.getElementById(id);
    const img = el?.querySelector('img');
    expect(img?.hasAttribute('src')).toBe(false);
  });

  it('should block vbscript: in href', () => {
    const id = ui.addHUDElement('xss_vbs', {
      position: 'top-left',
      html: '<a href="vbscript:alert(1)">Click me</a>'
    });
    const el = document.getElementById(id);
    const a = el?.querySelector('a');
    expect(a?.hasAttribute('href')).toBe(false);
  });

  it('should block data: in href', () => {
    const id = ui.addHUDElement('xss_data', {
      position: 'top-left',
      html: '<a href="data:text/html,<script>alert(1)</script>">Click me</a>'
    });
    const el = document.getElementById(id);
    const a = el?.querySelector('a');
    expect(a?.hasAttribute('href')).toBe(false);
  });

  it('should remove base tags', () => {
    const id = ui.addHUDElement('xss_base', {
      position: 'top-left',
      html: '<base href="javascript:alert(1)//">'
    });
    const el = document.getElementById(id);
    expect(el?.querySelector('base')).toBeNull();
  });

  it('should remove form tags', () => {
    const id = ui.addHUDElement('xss_form', {
      position: 'top-left',
      html: '<form action="javascript:alert(1)"><input type="submit"></form>'
    });
    const el = document.getElementById(id);
    expect(el?.querySelector('form')).toBeNull();
  });

  it('should remove svg tags', () => {
    const id = ui.addHUDElement('xss_svg', {
      position: 'top-left',
      html: '<svg><script>alert(1)</script></svg>'
    });
    const el = document.getElementById(id);
    expect(el?.querySelector('svg')).toBeNull();
  });

  it('should remove style attributes', () => {
    const id = ui.addHUDElement('xss_style', {
      position: 'top-left',
      html: '<div style="background: url(javascript:alert(1))"></div>'
    });
    const el = document.getElementById(id);
    const div = el?.querySelector('div');
    expect(div?.hasAttribute('style')).toBe(false);
  });

  it('should sanitize updateHUDElement as well', () => {
     const id = ui.addHUDElement('update_test', {
       position: 'top-left',
       text: 'safe'
     });
     ui.updateHUDElement('update_test', {
       html: '<a href="javascript:alert(1)">Unsafe</a>'
     });
     const el = document.getElementById(id);
     const a = el?.querySelector('a');
     expect(a?.hasAttribute('href')).toBe(false);
  });
});
