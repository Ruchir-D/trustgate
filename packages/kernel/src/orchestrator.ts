import type { Check, Ecosystem, Verdict } from './types';
import { existenceCheck } from './checks/existence';
import { ageCheck } from './checks/age';
import { createLookalikeCheck } from './checks/lookalike';
import { adoptionCheck } from './checks/adoption';
import { blocklistCheck } from './checks/blocklist';
import { permissionsCheck } from './checks/permissions';
import { fetchNpmMetadata } from './registries/npm';
import { fetchPypiMetadata } from './registries/pypi';
import { fetchMcpMetadata } from './registries/mcp';

async function fetchMetadata(identifier: string, ecosystem: Ecosystem) {
  switch (ecosystem) {
    case 'npm':   return fetchNpmMetadata(identifier);
    case 'pypi':  return fetchPypiMetadata(identifier);
    case 'mcp':   return fetchMcpMetadata(identifier);
  }
}

export async function scan(identifier: string, ecosystem: Ecosystem): Promise<Verdict> {
  const meta = await fetchMetadata(identifier, ecosystem);

  const baseChecks: Check[] = [
    existenceCheck,
    ageCheck,
    createLookalikeCheck(ecosystem),
    adoptionCheck,
    blocklistCheck,
  ];

  const applicableChecks = ecosystem === 'mcp'
    ? [...baseChecks, permissionsCheck]
    : baseChecks;

  const signals = await Promise.all(applicableChecks.map((c) => c.run(meta, identifier)));
  const score = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));
  const riskLevel = score >= 60 ? 'high' : score >= 25 ? 'medium' : 'low';

  return {
    identifier,
    ecosystem,
    score,
    riskLevel,
    signals: signals.filter((s) => !s.passed || s.weight > 0),
    checkedAt: new Date().toISOString(),
  };
}
