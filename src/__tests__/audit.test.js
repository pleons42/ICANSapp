import { describe, it, expect } from 'vitest';
import { computeAuditHash, verifyAuditEntry } from '../audit.js';

const SAMPLE = { ts: '2025-01-01T10:00:00.000Z', action: 'Therapieempfehlung', detail: 'ICE=8 · ICANS G1' };

describe('computeAuditHash', () => {
  it('returns a 64-character hex string', async () => {
    const hash = await computeAuditHash(SAMPLE);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', async () => {
    const h1 = await computeAuditHash(SAMPLE);
    const h2 = await computeAuditHash(SAMPLE);
    expect(h1).toBe(h2);
  });

  it('produces a different hash when any field changes', async () => {
    const h1 = await computeAuditHash(SAMPLE);
    const h2 = await computeAuditHash({ ...SAMPLE, detail: 'ICE=7 · ICANS G1' });
    const h3 = await computeAuditHash({ ...SAMPLE, action: 'HLH-Screening' });
    const h4 = await computeAuditHash({ ...SAMPLE, ts: '2025-01-01T10:00:01.000Z' });
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).not.toBe(h4);
  });
});

describe('verifyAuditEntry', () => {
  it('returns "ok" for an entry with a correct hash', async () => {
    const hash = await computeAuditHash(SAMPLE);
    const result = await verifyAuditEntry({ ...SAMPLE, hash });
    expect(result).toBe('ok');
  });

  it('returns "tampered" when the hash does not match', async () => {
    const result = await verifyAuditEntry({ ...SAMPLE, hash: 'a'.repeat(64) });
    expect(result).toBe('tampered');
  });

  it('returns "unverified" when hash is null', async () => {
    const result = await verifyAuditEntry({ ...SAMPLE, hash: null });
    expect(result).toBe('unverified');
  });

  it('returns "unverified" when hash is "no-webcrypto"', async () => {
    const result = await verifyAuditEntry({ ...SAMPLE, hash: 'no-webcrypto' });
    expect(result).toBe('unverified');
  });

  it('detects tampering if detail is modified after hashing', async () => {
    const hash = await computeAuditHash(SAMPLE);
    const tampered = { ...SAMPLE, detail: 'ICE=0 · ICANS G4', hash };
    const result = await verifyAuditEntry(tampered);
    expect(result).toBe('tampered');
  });

  it('detects tampering if action is modified after hashing', async () => {
    const hash = await computeAuditHash(SAMPLE);
    const tampered = { ...SAMPLE, action: 'INJECTED', hash };
    const result = await verifyAuditEntry(tampered);
    expect(result).toBe('tampered');
  });
});
