import type { Check, Ecosystem } from '../types';
import top10kNpm from '../../data/top-10k-npm.json';
import top10kPypi from '../../data/top-10k-pypi.json';

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// PEP 503: hyphens, underscores, and dots are equivalent in PyPI package names
function normalizePypi(name: string): string {
  return name.toLowerCase().replace(/[-_.]+/g, '-');
}

export function createLookalikeCheck(ecosystem: Ecosystem): Check {
  const list: string[] = ecosystem === 'pypi' ? (top10kPypi as string[]) : (top10kNpm as string[]);
  const normalize = ecosystem === 'pypi' ? normalizePypi : (s: string) => s.toLowerCase();

  return {
    name: 'lookalike',
    run: (meta, identifier) => {
      const normalizedId = normalize(identifier);

      const close = list
        .map((name) => ({ name, dist: levenshtein(normalizedId, normalize(name)) }))
        .filter((c) => c.dist > 0 && c.dist <= 2)
        .sort((a, b) => a.dist - b.dist);

      if (close.length === 0) {
        return { checkName: 'lookalike', passed: true, weight: 0, reason: 'No close match to top packages' };
      }

      const best = close[0];

      if (!meta.exists) {
        // Non-existent + lookalike = hallucinated typo pointing at a real popular package
        return {
          checkName: 'lookalike',
          passed: false,
          weight: 40,
          reason: `Close match to popular package "${best.name}" (edit distance ${best.dist}) — possible hallucinated typo`,
          metadata: { candidates: close.slice(0, 3) },
        };
      }

      if (best.dist === 1) {
        // Exists but is one character away from a popular package — classic typosquat indicator
        return {
          checkName: 'lookalike',
          passed: false,
          weight: 25,
          reason: `One character away from popular package "${best.name}" — possible typosquat`,
          metadata: { candidates: close.slice(0, 3) },
        };
      }

      return { checkName: 'lookalike', passed: true, weight: 0, reason: 'No close match to top packages' };
    },
  };
}
