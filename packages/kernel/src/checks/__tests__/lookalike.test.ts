import { describe, it, expect } from 'vitest';
import { createLookalikeCheck } from '../lookalike';
import type { RegistryMetadata } from '../../types';

const missing  = (name: string): RegistryMetadata => ({ exists: false, name });
const existing = (name: string): RegistryMetadata => ({ exists: true,  name });

const npm  = createLookalikeCheck('npm');
const pypi = createLookalikeCheck('pypi');

describe('createLookalikeCheck — npm', () => {
  describe('non-existent package + close match → weight 40', () => {
    it('flags a 1-char addition ("lodash_" vs "lodash")', () => {
      const s = npm.run(missing('lodash_'), 'lodash_');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(40);
      expect(s.reason).toMatch(/lodash/);
      expect(s.reason).toMatch(/edit distance 1/);
    });

    it('flags a 1-char substitution ("lodush" vs "lodash")', () => {
      const s = npm.run(missing('lodush'), 'lodush');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(40);
    });

    it('flags a 2-char edit ("loodash" — insert + existing is same prefix)', () => {
      const s = npm.run(missing('loodash'), 'loodash');
      // levenshtein("loodash", "lodash") = 1 (delete one 'o'), so still dist 1
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(40);
    });

    it('flags dist-2 typo ("axois" vs "axios")', () => {
      // axois: a,x,o,i,s vs axios: a,x,i,o,s → transposition = dist 2
      const s = npm.run(missing('axois'), 'axois');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(40);
    });

    it('includes candidates in metadata', () => {
      const s = npm.run(missing('lodash_'), 'lodash_');
      expect(s.metadata?.candidates).toBeDefined();
      expect((s.metadata?.candidates as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe('existing package with dist-1 match → weight 25', () => {
    it('flags "reacts" (dist 1 from "react") as possible typosquat', () => {
      // "reacts" vs "react": 1 insertion. "reacts" is in our list but if not it's still dist 1
      // actually "reacts" is NOT in our top list; "react" IS. dist = 1.
      const s = npm.run(existing('reacts'), 'reacts');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(25);
      expect(s.reason).toMatch(/one character away/i);
    });
  });

  describe('passes — no concern', () => {
    it('passes an existing package with no close match', () => {
      const s = npm.run(existing('zzzzunknownpkg99'), 'zzzzunknownpkg99');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('passes a non-existent package with no close match', () => {
      const s = npm.run(missing('zzzzunknownpkg99'), 'zzzzunknownpkg99');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('does not flag an existing dist-2 match (only dist-1 triggers on existing)', () => {
      // "axois" is dist 2 from "axios" — existing but dist > 1 → passes
      const s = npm.run(existing('axois'), 'axois');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('does not flag the exact package name itself', () => {
      // "lodash" vs "lodash" → dist 0, filtered out
      const s = npm.run(existing('lodash'), 'lodash');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });
  });

  it('always sets checkName to "lookalike"', () => {
    expect(npm.run(missing('lodash'), 'lodash').checkName).toBe('lookalike');
  });
});

describe('createLookalikeCheck — pypi (PEP 503 normalisation)', () => {
  it('treats "nump_y" as dist-1 from "numpy" after normalisation', () => {
    // normalizePypi("nump_y") = "nump-y", normalizePypi("numpy") = "numpy"
    // levenshtein("nump-y", "numpy") = 1 (delete the '-')
    const s = pypi.run(missing('nump_y'), 'nump_y');
    expect(s.passed).toBe(false);
    expect(s.weight).toBe(40);
  });

  it('treats "Requests" (capital R) as dist-0 — exact match after lowercasing, not flagged', () => {
    // normalizePypi("Requests") = "requests" = normalizePypi("requests")
    // dist = 0, excluded from candidates
    const s = pypi.run(existing('Requests'), 'Requests');
    expect(s.passed).toBe(true);
    expect(s.weight).toBe(0);
  });

  it('treats "numpy-extra" as dist > 2 from "numpy" — not flagged', () => {
    // normalizePypi("numpy-extra") = "numpy-extra" (11 chars)
    // normalizePypi("numpy") = "numpy" (5 chars) → dist >= 6
    const s = pypi.run(missing('numpy-extra'), 'numpy-extra');
    expect(s.passed).toBe(true);
    expect(s.weight).toBe(0);
  });

  it('flags "numpi" (dist 1 from "numpy")', () => {
    const s = pypi.run(missing('numpi'), 'numpi');
    expect(s.passed).toBe(false);
    expect(s.weight).toBe(40);
  });
});
