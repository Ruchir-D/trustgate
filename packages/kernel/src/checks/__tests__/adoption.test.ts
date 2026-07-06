import { describe, it, expect } from 'vitest';
import { adoptionCheck } from '../adoption';
import type { RegistryMetadata } from '../../types';

const base: RegistryMetadata = { exists: true, name: 'pkg' };

describe('adoptionCheck', () => {
  describe('skips when package is absent', () => {
    it('skips when exists: false', () => {
      const s = adoptionCheck.run({ ...base, exists: false, downloads: 0 }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
      expect(s.reason).toMatch(/does not exist/i);
    });

    it('skips when exists: undefined (network error)', () => {
      const s = adoptionCheck.run({ ...base, exists: undefined, downloads: 0 }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });
  });

  describe('download-based (npm / pypi)', () => {
    it('flags 0 downloads', () => {
      const s = adoptionCheck.run({ ...base, downloads: 0 }, 'pkg');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(20);
      expect(s.reason).toMatch(/0/);
    });

    it('flags 999 downloads (below threshold)', () => {
      const s = adoptionCheck.run({ ...base, downloads: 999 }, 'pkg');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(20);
    });

    it('passes 1 000 downloads (at threshold, not below)', () => {
      const s = adoptionCheck.run({ ...base, downloads: 1_000 }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('passes 50 000 000 downloads', () => {
      const s = adoptionCheck.run({ ...base, downloads: 50_000_000 }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('includes the count in the reason string', () => {
      const s = adoptionCheck.run({ ...base, downloads: 42 }, 'pkg');
      expect(s.reason).toMatch(/42/);
    });
  });

  describe('star-based (mcp / github)', () => {
    it('flags 0 stars', () => {
      const s = adoptionCheck.run({ ...base, stars: 0 }, 'pkg');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(20);
    });

    it('flags 9 stars (below threshold)', () => {
      const s = adoptionCheck.run({ ...base, stars: 9 }, 'pkg');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(20);
    });

    it('passes 10 stars (at threshold)', () => {
      const s = adoptionCheck.run({ ...base, stars: 10 }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('prefers downloads over stars when both present', () => {
      // downloads is checked first; if present, stars is ignored
      const sLow  = adoptionCheck.run({ ...base, downloads: 0, stars: 500 }, 'pkg');
      const sHigh = adoptionCheck.run({ ...base, downloads: 50_000, stars: 0 }, 'pkg');
      expect(sLow.passed).toBe(false);   // downloads=0 flagged, stars ignored
      expect(sHigh.passed).toBe(true);   // downloads=50k passes, stars ignored
    });
  });

  describe('no metrics', () => {
    it('passes with "no adoption metrics" when neither downloads nor stars present', () => {
      const s = adoptionCheck.run({ ...base }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
      expect(s.reason).toMatch(/no adoption metrics/i);
    });
  });

  it('always sets checkName to "adoption"', () => {
    expect(adoptionCheck.run(base, 'pkg').checkName).toBe('adoption');
  });
});
