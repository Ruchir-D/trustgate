import type { Check } from '../types';

const DOWNLOADS_THRESHOLD = 1_000;
const STARS_THRESHOLD = 10;

export const adoptionCheck: Check = {
  name: 'adoption',
  run: (meta) => {
    if (!meta.exists) {
      return { checkName: 'adoption', passed: true, weight: 0, reason: 'Package does not exist' };
    }

    if (meta.downloads !== undefined) {
      const flagged = meta.downloads < DOWNLOADS_THRESHOLD;
      return {
        checkName: 'adoption',
        passed: !flagged,
        weight: flagged ? 20 : 0,
        reason: flagged
          ? `Only ${meta.downloads.toLocaleString()} downloads last month — very low adoption`
          : `${meta.downloads.toLocaleString()} downloads last month`,
      };
    }

    if (meta.stars !== undefined) {
      const flagged = meta.stars < STARS_THRESHOLD;
      return {
        checkName: 'adoption',
        passed: !flagged,
        weight: flagged ? 20 : 0,
        reason: flagged
          ? `Only ${meta.stars} GitHub stars — low adoption`
          : `${meta.stars} GitHub stars`,
      };
    }

    return { checkName: 'adoption', passed: true, weight: 0, reason: 'No adoption metrics available' };
  },
};
