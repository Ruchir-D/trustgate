export { scan } from './orchestrator';

export type { Ecosystem, CheckSignal, Verdict, RegistryMetadata, Check } from './types';

export { existenceCheck } from './checks/existence';
export { ageCheck } from './checks/age';
export { createLookalikeCheck } from './checks/lookalike';
export { adoptionCheck } from './checks/adoption';
export { blocklistCheck } from './checks/blocklist';
export { permissionsCheck } from './checks/permissions';

export { fetchNpmMetadata } from './registries/npm';
export { fetchPypiMetadata } from './registries/pypi';
export { fetchMcpMetadata } from './registries/mcp';
