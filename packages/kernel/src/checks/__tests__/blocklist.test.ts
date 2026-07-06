import { describe, it, expect } from 'vitest';
import { blocklistCheck } from '../blocklist';
import type { RegistryMetadata } from '../../types';

const meta: RegistryMetadata = { exists: true, name: 'pkg' };

describe('blocklistCheck', () => {
  describe('blocked packages', () => {
    it('blocks "event-stream"', () => {
      const s = blocklistCheck.run(meta, 'event-stream');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(100);
      expect(s.reason).toMatch(/event-stream/);
    });

    it('blocks "ua-parser-js"', () => {
      const s = blocklistCheck.run(meta, 'ua-parser-js');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(100);
    });

    it('blocks "flatmap-stream"', () => {
      const s = blocklistCheck.run(meta, 'flatmap-stream');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(100);
    });
  });

  describe('case-insensitive matching', () => {
    it('blocks "EVENT-STREAM" (uppercase)', () => {
      const s = blocklistCheck.run(meta, 'EVENT-STREAM');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(100);
    });

    it('blocks "Event-Stream" (mixed case)', () => {
      const s = blocklistCheck.run(meta, 'Event-Stream');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(100);
    });
  });

  describe('safe packages', () => {
    it('allows "lodash"', () => {
      const s = blocklistCheck.run(meta, 'lodash');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
      expect(s.reason).toMatch(/not on blocklist/i);
    });

    it('allows "react"', () => {
      const s = blocklistCheck.run(meta, 'react');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('allows an empty string without throwing', () => {
      const s = blocklistCheck.run(meta, '');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });
  });

  it('fires regardless of registry metadata (meta is ignored)', () => {
    const missing: RegistryMetadata = { exists: false, name: 'event-stream' };
    const s = blocklistCheck.run(missing, 'event-stream');
    expect(s.passed).toBe(false);
    expect(s.weight).toBe(100);
  });

  it('always sets checkName to "blocklist"', () => {
    expect(blocklistCheck.run(meta, 'lodash').checkName).toBe('blocklist');
  });
});
