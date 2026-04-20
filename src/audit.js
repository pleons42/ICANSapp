/**
 * Audit trail integrity helpers (pure async, no DOM/storage side-effects).
 */

/**
 * Compute SHA-256 hex digest for an audit entry using the Web Crypto API.
 * The canonical string is:  ts|action|detail
 * @param {{ ts: string, action: string, detail: string }} entry
 * @returns {Promise<string>}  hex digest, or 'no-webcrypto' / 'hash-error'
 */
export async function computeAuditHash(entry) {
  if (typeof crypto === 'undefined' || !crypto.subtle) return 'no-webcrypto';
  var str = entry.ts + '|' + entry.action + '|' + entry.detail;
  try {
    var encoder = new TextEncoder();
    var hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(str));
    return Array.from(new Uint8Array(hashBuf))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  } catch (_) {
    return 'hash-error';
  }
}

/**
 * Verify whether a stored hash matches a freshly computed one.
 * @param {{ ts: string, action: string, detail: string, hash: string }} entry
 * @returns {Promise<'ok'|'tampered'|'unverified'|'error'>}
 */
export async function verifyAuditEntry(entry) {
  if (!entry.hash || entry.hash === 'no-webcrypto') return 'unverified';
  try {
    var computed = await computeAuditHash(entry);
    if (computed === 'hash-error') return 'error';
    return computed === entry.hash ? 'ok' : 'tampered';
  } catch (_) {
    return 'error';
  }
}
