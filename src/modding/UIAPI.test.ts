// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { UIAPI } from './UIAPI';

describe('UIAPI Security', () => {
  let uiApi: UIAPI;

  beforeEach(() => {
    uiApi = new UIAPI('test-mod');
    document.body.innerHTML = '';
  });

  it('should prevent simple script injection', () => {
    const malicious = '<script>alert(1)</script>';
    uiApi.addHUDElement('test1', { position: 'top-left', html: malicious });

    const element = document.getElementById('mod_test-mod_test1');
    expect(element?.innerHTML).not.toContain('<script>');
  });

  it('should prevent inline event handlers', () => {
    const malicious = '<div onclick="alert(1)">Click me</div>';
    uiApi.addHUDElement('test2', { position: 'top-left', html: malicious });

    const element = document.getElementById('mod_test-mod_test2');
    expect(element?.innerHTML).toContain('<div');
    expect(element?.innerHTML).not.toContain('onclick');
  });

  // VULNERABILITY REPRODUCTIONS

  it('should prevent form action javascript injection', () => {
    const malicious = '<form action="javascript:alert(1)"><input type="submit"></form>';
    uiApi.addHUDElement('vuln1', { position: 'top-left', html: malicious });

    const element = document.getElementById('mod_test-mod_vuln1');
    // We expect this to be cleaned, but currently it likely isn't
    const inner = element?.innerHTML || '';
    // If vulnerability exists, this expectation will fail (we want it to NOT contain it)
    expect(inner).not.toContain('javascript:alert(1)');
  });

  it('should prevent data URI injection', () => {
    const malicious = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Click</a>';
    uiApi.addHUDElement('vuln2', { position: 'top-left', html: malicious });

    const element = document.getElementById('mod_test-mod_vuln2');
    const inner = element?.innerHTML || '';
    expect(inner).not.toContain('href="data:');
  });

  it('should prevent whitespace obfuscated javascript injection', () => {
    // Note: browsers handle whitespace differently, but "java script:" is generally invalid.
    // However, "javascript\n:" or similar can sometimes work.
    // Let's test standard "javascript:" with leading whitespace which the current code MIGHT handle if it trims?
    // The current code does NOT trim.
    const malicious = '<a href=" javascript:alert(1)">Click</a>';
    uiApi.addHUDElement('vuln3', { position: 'top-left', html: malicious });

    const element = document.getElementById('mod_test-mod_vuln3');
    const inner = element?.innerHTML || '';
    // We want to ensure it cleans it.
    expect(inner).not.toContain('javascript:alert(1)');
  });

  it('should prevent form tags entirely (hardening)', () => {
     const malicious = '<form><input></form>';
     uiApi.addHUDElement('vuln4', { position: 'top-left', html: malicious });
     const element = document.getElementById('mod_test-mod_vuln4');
     expect(element?.innerHTML).not.toContain('<form');
  });
});
