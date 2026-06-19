import type { RegistryMetadata } from '../types';

// MCP servers are distributed either via npm (most common) or hosted on GitHub.
// Identifier formats:
//   "owner/repo"              → GitHub-hosted server
//   "package-name" or        → npm-distributed server
//   "@scope/package-name"    → scoped npm package

const GITHUB_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export async function fetchMcpMetadata(identifier: string): Promise<RegistryMetadata> {
  if (GITHUB_REPO_RE.test(identifier) && !identifier.startsWith('@')) {
    return fetchGitHubMcpMetadata(identifier);
  }
  return fetchNpmMcpMetadata(identifier);
}

async function fetchNpmMcpMetadata(packageName: string): Promise<RegistryMetadata> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);

    if (res.status === 404) return { exists: false, name: packageName };
    if (!res.ok) throw new Error(`npm registry responded ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    const distTags = data['dist-tags'] as Record<string, string> | undefined;
    const latest = distTags?.latest;
    const time = data['time'] as Record<string, string> | undefined;
    const publishedAt = latest ? time?.[latest] : undefined;

    // Expose the latest version's package.json as raw so permissionsCheck
    // can read mcp.tools declarations
    const versions = data['versions'] as Record<string, unknown> | undefined;
    const latestPkgJson = latest && versions ? versions[latest] : data;

    return {
      exists: true,
      name: packageName,
      publishedAt,
      raw: latestPkgJson,
    };
  } catch (err) {
    return { exists: undefined, name: packageName, raw: { error: String(err) } };
  }
}

async function fetchGitHubMcpMetadata(repo: string): Promise<RegistryMetadata> {
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (repoRes.status === 404) return { exists: false, name: repo };
    if (!repoRes.ok) throw new Error(`GitHub API responded ${repoRes.status}`);

    const repoData = await repoRes.json() as {
      stargazers_count?: number;
      forks_count?: number;
      created_at?: string;
      pushed_at?: string;
      default_branch?: string;
    };

    // Try to fetch mcp.json or package.json for tool declarations
    let manifest: unknown;
    for (const path of ['mcp.json', 'package.json']) {
      try {
        const mRes = await fetch(
          `https://raw.githubusercontent.com/${repo}/${repoData.default_branch ?? 'main'}/${path}`
        );
        if (mRes.ok) {
          manifest = await mRes.json();
          break;
        }
      } catch {
        // try next candidate
      }
    }

    return {
      exists: true,
      name: repo,
      publishedAt: repoData.created_at,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      maintainerActivity: repoData.pushed_at,
      raw: manifest ?? repoData,
    };
  } catch (err) {
    return { exists: undefined, name: repo, raw: { error: String(err) } };
  }
}
