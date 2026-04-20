/**
 * Shared utility functions (DOM-independent).
 */

/**
 * Escape a string for safe insertion into HTML.
 * @param {string} s
 * @returns {string}
 */
export function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
