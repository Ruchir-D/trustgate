#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { scan, type Ecosystem, type Verdict } from '@trustgate/kernel';

const ECOSYSTEMS: Ecosystem[] = ['npm', 'pypi', 'mcp'];

const RISK_COLOR: Record<Verdict['riskLevel'], string> = {
  low: '\x1b[32m',
  medium: '\x1b[33m',
  high: '\x1b[31m',
};
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function printUsage(): void {
  console.log(`Usage: trustgate scan <ecosystem>:<identifier> [--json]

Ecosystems: ${ECOSYSTEMS.join(', ')}

Examples:
  trustgate scan npm:left-pad
  trustgate scan pypi:requests --json
  trustgate scan mcp:some-server`);
}

function parseTarget(target: string): { ecosystem: Ecosystem; identifier: string } {
  const separatorIndex = target.indexOf(':');
  if (separatorIndex === -1) {
    throw new Error(`Missing ecosystem prefix in "${target}". Expected format <ecosystem>:<identifier>, e.g. npm:${target}`);
  }

  const ecosystem = target.slice(0, separatorIndex);
  const identifier = target.slice(separatorIndex + 1);

  if (!ECOSYSTEMS.includes(ecosystem as Ecosystem)) {
    throw new Error(`Unknown ecosystem "${ecosystem}". Expected one of: ${ECOSYSTEMS.join(', ')}`);
  }
  if (!identifier) {
    throw new Error(`Missing identifier in "${target}"`);
  }

  return { ecosystem: ecosystem as Ecosystem, identifier };
}

function printHuman(verdict: Verdict): void {
  const color = RISK_COLOR[verdict.riskLevel];
  console.log(`\n${BOLD}${verdict.identifier}${RESET} ${DIM}(${verdict.ecosystem})${RESET}`);
  console.log(`Risk:  ${color}${BOLD}${verdict.riskLevel.toUpperCase()}${RESET} ${DIM}(score ${verdict.score}/100)${RESET}`);

  if (verdict.signals.length === 0) {
    console.log(`${DIM}No signals triggered.${RESET}`);
  } else {
    console.log('Signals:');
    for (const signal of verdict.signals) {
      const marker = signal.passed ? `${RISK_COLOR.low}✓${RESET}` : `${RISK_COLOR.high}✗${RESET}`;
      console.log(`  ${marker} ${signal.checkName} ${DIM}(+${signal.weight})${RESET} — ${signal.reason}`);
    }
  }
  console.log(`${DIM}Checked at ${verdict.checkedAt}${RESET}\n`);
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help || positionals.length === 0) {
    printUsage();
    process.exit(values.help ? 0 : 1);
  }

  const [command, target] = positionals;

  if (command !== 'scan' || !target) {
    printUsage();
    process.exit(1);
  }

  const { ecosystem, identifier } = parseTarget(target);
  const verdict = await scan(identifier, ecosystem);

  if (values.json) {
    console.log(JSON.stringify(verdict, null, 2));
  } else {
    printHuman(verdict);
  }
}

main().catch((err) => {
  console.error(`${RISK_COLOR.high}Error:${RESET} ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
