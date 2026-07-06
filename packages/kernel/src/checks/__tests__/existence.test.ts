import { describe, it, expect } from 'vitest';
import { existenceCheck } from '../existence';
import type { RegistryMetadata } from '../../types';

const base: RegistryMetadata = { exists: true, name: 'pkg' };

describe('existenceCheck', () => {
  it('passes with weight 0 when package exists', () => {
    const s = existenceCheck.run({ ...base, exists: true }, 'pkg');
    expect(s.passed).toBe(true);
    expect(s.weight).toBe(0);
    expect(s.reason).toMatch(/resolves on registry/i);
  });

  it('fails with weight 100 when package is missing (definitive 404)', () => {
    const s = existenceCheck.run({ ...base, exists: false }, 'pkg');
    expect(s.passed).toBe(false);
    expect(s.weight).toBe(100);
    expect(s.reason).toMatch(/not found/i);
  });

  it('fails with weight 50 on network failure (undefined)', () => {
    const s = existenceCheck.run({ ...base, exists: undefined }, 'pkg');
    expect(s.passed).toBe(false);
    expect(s.weight).toBe(50);
    expect(s.reason).toMatch(/unreachable/i);
  });

  it('always sets checkName to "existence"', () => {
    for (const exists of [true, false, undefined] as const) {
      expect(existenceCheck.run({ ...base, exists }, 'pkg').checkName).toBe('existence');
    }
  });
});
