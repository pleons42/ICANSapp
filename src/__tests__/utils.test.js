import { describe, it, expect } from 'vitest';
import { escHtml } from '../utils.js';

describe('escHtml', () => {
  it('escapes ampersand', () => {
    expect(escHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than', () => {
    expect(escHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than', () => {
    expect(escHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('handles all dangerous characters together', () => {
    expect(escHtml('<a href="x">X & Y</a>')).toBe('&lt;a href=&quot;x&quot;&gt;X &amp; Y&lt;/a&gt;');
  });

  it('returns empty string for empty input', () => {
    expect(escHtml('')).toBe('');
  });

  it('returns empty string for null/undefined (coerced via String())', () => {
    expect(escHtml(null)).toBe('');
    expect(escHtml(undefined)).toBe('');
  });

  it('leaves safe strings unchanged', () => {
    expect(escHtml('hello world 123')).toBe('hello world 123');
  });

  it('prevents XSS payload from being interpreted as markup', () => {
    const payload = '<img src=x onerror="alert(1)">';
    const escaped = escHtml(payload);
    expect(escaped).not.toContain('<img');
    expect(escaped).toContain('&lt;img');
  });
});
