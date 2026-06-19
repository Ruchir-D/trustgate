import type { Check } from '../types';

const YOUNG_PACKAGE_THRESHOLD_DAYS = 60;

export const ageCheck: Check = {
  name: 'age',
  run: (meta) => {
    if (!meta.exists || !meta.publishedAt) {
      return { checkName: 'age', passed: true, weight: 0, reason: 'No publish date available' };
    }
    const ageDays = (Date.now() - new Date(meta.publishedAt).getTime()) / 86_400_000;
    const flagged = ageDays < YOUNG_PACKAGE_THRESHOLD_DAYS;
    return {
      checkName: 'age',
      passed: !flagged,
      weight: flagged ? 30 : 0,
      reason: flagged
        ? `Published ${Math.round(ageDays)} days ago — within typosquat/malicious-campaign window`
        : `Published ${Math.round(ageDays)} days ago`,
    };
  },
};
