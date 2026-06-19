import type { Check } from '../types';

export const existenceCheck: Check = {
  name: 'existence',
  run: (meta) => {
    if (meta.exists === undefined) {
      return {
        checkName: 'existence',
        passed: false,
        weight: 50,
        reason: 'Registry unreachable — could not verify package existence',
      };
    }
    return {
      checkName: 'existence',
      passed: meta.exists,
      weight: meta.exists ? 0 : 100,
      reason: meta.exists
        ? 'Package resolves on registry'
        : 'Package not found on registry — likely hallucinated',
    };
  },
};
