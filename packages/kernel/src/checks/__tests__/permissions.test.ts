import { describe, it, expect } from 'vitest';
import { permissionsCheck } from '../permissions';
import type { RegistryMetadata } from '../../types';

const base: RegistryMetadata = { exists: true, name: 'mcp-server' };

const withTools = (tools: Array<{ name: string; description?: string }>): RegistryMetadata => ({
  ...base,
  raw: { mcp: { tools } },
});

const withTopLevelTools = (tools: Array<{ name: string }>): RegistryMetadata => ({
  ...base,
  raw: { tools },
});

describe('permissionsCheck', () => {
  describe('skips absent packages', () => {
    it('skips when exists: false', () => {
      const s = permissionsCheck.run({ ...base, exists: false }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });

    it('skips when exists: undefined', () => {
      const s = permissionsCheck.run({ ...base, exists: undefined }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });
  });

  describe('no tool declarations', () => {
    it('passes when raw is absent', () => {
      const s = permissionsCheck.run({ ...base }, 'pkg');
      expect(s.passed).toBe(true);
      expect(s.reason).toMatch(/no tool declarations/i);
    });

    it('passes when mcp.tools is an empty array', () => {
      const s = permissionsCheck.run(withTools([]), 'pkg');
      expect(s.passed).toBe(true);
    });

    it('passes when top-level tools is empty', () => {
      const s = permissionsCheck.run(withTopLevelTools([]), 'pkg');
      expect(s.passed).toBe(true);
    });
  });

  describe('safe tools', () => {
    it('passes a tool with a benign name', () => {
      const s = permissionsCheck.run(withTools([{ name: 'get_weather' }]), 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
      expect(s.reason).toMatch(/1 declared tool/);
    });

    it('passes multiple safe tools', () => {
      const s = permissionsCheck.run(withTools([
        { name: 'list_todos' },
        { name: 'add_todo' },
        { name: 'complete_todo' },
      ]), 'pkg');
      expect(s.passed).toBe(true);
      expect(s.weight).toBe(0);
    });
  });

  describe('high-risk tool names', () => {
    const riskyCases = [
      'exec', 'shell', 'bash', 'spawn', 'run_command', 'execute',
      'write_file', 'delete_file', 'remove_file', 'create_file',
      'read_file', 'list_dir', 'list_directory',
      'eval', 'run_code', 'execute_code', 'run_script',
      'get_secret', 'get_credential', 'get_token', 'get_password',
      'http_request', 'fetch_url', 'make_request', 'curl',
    ];

    it.each(riskyCases)('flags tool named "%s"', (name) => {
      const s = permissionsCheck.run(withTools([{ name }]), 'pkg');
      expect(s.passed).toBe(false);
      expect(s.weight).toBeGreaterThan(0);
    });
  });

  describe('high-risk tool descriptions', () => {
    it('flags a safe name but risky description containing "exec"', () => {
      const s = permissionsCheck.run(withTools([{
        name: 'do_thing',
        description: 'Uses exec to run a subprocess',
      }]), 'pkg');
      expect(s.passed).toBe(false);
    });

    it('flags a safe name but risky description containing "write_file"', () => {
      const s = permissionsCheck.run(withTools([{
        name: 'save',
        description: 'Calls write_file internally',
      }]), 'pkg');
      expect(s.passed).toBe(false);
    });
  });

  describe('weight calculation', () => {
    it('weight = 30 + 10 per risky tool, capped at 60', () => {
      const tools = (names: string[]) => names.map((name) => ({ name }));

      const s1 = permissionsCheck.run(withTools(tools(['exec'])), 'pkg');
      expect(s1.weight).toBe(40); // 30 + 1*10

      const s2 = permissionsCheck.run(withTools(tools(['exec', 'write_file'])), 'pkg');
      expect(s2.weight).toBe(50); // 30 + 2*10

      const s3 = permissionsCheck.run(withTools(tools(['exec', 'write_file', 'eval'])), 'pkg');
      expect(s3.weight).toBe(60); // 30 + 3*10

      const s4 = permissionsCheck.run(withTools(tools(['exec', 'write_file', 'eval', 'bash'])), 'pkg');
      expect(s4.weight).toBe(60); // capped at 60
    });

    it('flags >20 tools with weight 30 even if none are risky', () => {
      const tools = Array.from({ length: 21 }, (_, i) => ({ name: `safe_tool_${i}` }));
      const s = permissionsCheck.run(withTools(tools), 'pkg');
      expect(s.passed).toBe(false);
      expect(s.weight).toBe(30);
      expect(s.reason).toMatch(/unusually broad/i);
    });

    it('combines risky tools + too-many-tools reasons', () => {
      const tools = [
        { name: 'exec' },
        ...Array.from({ length: 20 }, (_, i) => ({ name: `safe_${i}` })),
      ]; // 21 tools, 1 risky
      const s = permissionsCheck.run(withTools(tools), 'pkg');
      expect(s.passed).toBe(false);
      expect(s.reason).toMatch(/exec/);
      expect(s.reason).toMatch(/unusually broad/i);
    });
  });

  describe('tool extraction', () => {
    it('reads tools from mcp.tools (standard shape)', () => {
      const s = permissionsCheck.run(withTools([{ name: 'exec' }]), 'pkg');
      expect(s.passed).toBe(false);
    });

    it('reads tools from top-level tools field (fallback shape)', () => {
      const s = permissionsCheck.run(withTopLevelTools([{ name: 'exec' }]), 'pkg');
      expect(s.passed).toBe(false);
    });

    it('prefers mcp.tools over top-level tools', () => {
      const meta: RegistryMetadata = {
        ...base,
        raw: {
          mcp: { tools: [{ name: 'safe_tool' }] },
          tools: [{ name: 'exec' }], // should be ignored
        },
      };
      const s = permissionsCheck.run(meta, 'pkg');
      expect(s.passed).toBe(true); // reads mcp.tools (safe), not top-level tools
    });

    it('includes risky tool names in metadata', () => {
      const s = permissionsCheck.run(withTools([{ name: 'exec' }, { name: 'safe_tool' }]), 'pkg');
      expect(s.metadata?.riskyTools).toEqual(['exec']);
      expect(s.metadata?.totalTools).toBe(2);
    });
  });

  it('always sets checkName to "permissions"', () => {
    expect(permissionsCheck.run(base, 'pkg').checkName).toBe('permissions');
  });
});
