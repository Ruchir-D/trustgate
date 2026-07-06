import { describe, it, expect } from 'vitest';
import { ageCheck } from '../age';
import type { RegistryMetadata } from '../../types';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const base: RegistryMetadata = { exists: true, name: 'pkg' };

describe('ageCheck', () => {
  describe('skips when no useful data', () => {
    it('skips when package does not exist', () => {
      const s = ageCheck.run({ ...base, exists: false }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('skips when exists is undefined (network error)', () => {
      const s = ageCheck.run({ ...base, exists: undefined }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('skips when publishedAt is missing', () => {
      const s = ageCheck.run({ ...base, exists: true }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
      expect(s.reason).toMatch(/no publish date/i);
    });
  });

  describe('flags packages within the 60-day window', () => {
    it('flags a package published 1 day ago', () => {
      const s = ageCheck.run({ ...base, publishedAt: daysAgo(1) }, 'pkg');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(30);
      expect(s.reason).toMatch(/1 days? ago/i);
    });

    it('flags a package published 59 days ago', () => {
      const s = ageCheck.run({ ...base, publishedAt: daysAgo(59) }, 'pkg');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(30);
    });

    it('flags a package published today', () => {
      const s = ageCheck.run({ ...base, publishedAt: new Date().toISOString() }, 'pkg');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(30);
    });
  });

  describe('passes packages outside the window', () => {
    it('passes a package published exactly 60 days ago', () => {
      // 60 days is not < 60, so it should not be flagged
      const s = ageCheck.run({ ...base, publishedAt: daysAgo(60) }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('passes a package published 365 days ago', () => {
      const s = ageCheck.run({ ...base, publishedAt: daysAgo(365) }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('passes a package published years ago', () => {
      const s = ageCheck.run({ ...base, publishedAt: '2012-01-01T00:00:00Z' }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
      expect(s.reason).toMatch(/days ago/i);
    });
  });

  it('always sets checkName to "age"', () => {
    expect(ageCheck.run(base, 'pkg').checkName).toBe('age');
  });
});
