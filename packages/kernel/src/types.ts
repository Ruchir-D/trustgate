export type Ecosystem = 'npm' | 'pypi' | 'mcp';

export interface CheckSignal {
  checkName: string;
  passed: boolean;
  weight: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface Verdict {
  identifier: string;
  ecosystem: Ecosystem;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  signals: CheckSignal[];
  checkedAt: string;
}

export interface RegistryMetadata {
  // undefined = network failure (unknown), false = definitive 404, true = found
  exists: boolean | undefined;
  name: string;
  publishedAt?: string;
  downloads?: number;
  stars?: number;
  forks?: number;
  maintainerActivity?: string;
  raw?: unknown;
}

export interface Check {
  name: string;
  run: (meta: RegistryMetadata, identifier: string) => CheckSignal | Promise<CheckSignal>;
}
