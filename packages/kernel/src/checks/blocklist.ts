import type { Check } from '../types';
import blocklist from '../../data/blocklist.json';

const BLOCKED: Set<string> = new Set(blocklist as string[]);

export const blocklistCheck: Check = {
  name: 'blocklist',
  run: (_meta, identifier) => {
    const blocked = BLOCKED.has(identifier.toLowerCase());
    return {
      checkName: 'blocklist',
      passed: !blocked,
      weight: blocked ? 100 : 0,
      reason: blocked
        ? `"${identifier}" is on the known-malicious blocklist`
        : 'Not on blocklist',
    };
  },
};
