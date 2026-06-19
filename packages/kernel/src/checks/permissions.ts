import type { Check, CheckSignal } from '../types';

// Tools matching these patterns require explicit trust from the user
const HIGH_RISK_PATTERNS: RegExp[] = [
  /\b(exec|shell|bash|sh|zsh|fish|cmd|powershell|spawn|run_command|execute)\b/i,
  /\b(write_file|delete_file|remove_file|move_file|rename_file|create_file|overwrite)\b/i,
  /\b(read_file|list_dir|list_directory|read_dir|walk_dir|find_files)\b/i,
  /\b(eval|evaluate|run_code|execute_code|run_script)\b/i,
  /\b(get_secret|read_secret|fetch_secret|get_credential|get_token|get_password)\b/i,
  /\b(http_request|fetch_url|make_request|send_request|curl|wget)\b/i,
];

const TOOL_COUNT_THRESHOLD = 20;

interface McpTool {
  name: string;
  description?: string;
}

function extractTools(raw: unknown): McpTool[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;

  // Standard MCP manifest shape: { mcp: { tools: [...] } }
  if (r['mcp'] && typeof r['mcp'] === 'object') {
    const mcp = r['mcp'] as Record<string, unknown>;
    if (Array.isArray(mcp['tools'])) return mcp['tools'] as McpTool[];
  }

  // Some servers declare tools at the top level
  if (Array.isArray(r['tools'])) return r['tools'] as McpTool[];

  return [];
}

function isHighRisk(tool: McpTool): boolean {
  return HIGH_RISK_PATTERNS.some(
    (pat) => pat.test(tool.name) || (tool.description != null && pat.test(tool.description))
  );
}

export const permissionsCheck: Check = {
  name: 'permissions',
  run: (meta): CheckSignal => {
    if (!meta.exists) {
      return { checkName: 'permissions', passed: true, weight: 0, reason: 'Package does not exist' };
    }

    const tools = extractTools(meta.raw);

    if (tools.length === 0) {
      return {
        checkName: 'permissions',
        passed: true,
        weight: 0,
        reason: 'No tool declarations found in manifest',
      };
    }

    const riskyTools = tools.filter(isHighRisk);
    const tooManyTools = tools.length > TOOL_COUNT_THRESHOLD;

    if (riskyTools.length === 0 && !tooManyTools) {
      return {
        checkName: 'permissions',
        passed: true,
        weight: 0,
        reason: `${tools.length} declared tool(s), none flagged as high-risk`,
      };
    }

    const reasons: string[] = [];
    if (riskyTools.length > 0) {
      reasons.push(`${riskyTools.length} high-risk tool(s): ${riskyTools.map((t) => t.name).join(', ')}`);
    }
    if (tooManyTools) {
      reasons.push(`${tools.length} declared tools — unusually broad capability surface`);
    }

    return {
      checkName: 'permissions',
      passed: false,
      weight: Math.min(30 + riskyTools.length * 10, 60),
      reason: reasons.join('; '),
      metadata: { riskyTools: riskyTools.map((t) => t.name), totalTools: tools.length },
    };
  },
};
