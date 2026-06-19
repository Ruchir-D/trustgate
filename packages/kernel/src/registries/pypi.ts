import type { RegistryMetadata } from '../types';

export async function fetchPypiMetadata(packageName: string): Promise<RegistryMetadata> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`);

    if (res.status === 404) {
      return { exists: false, name: packageName };
    }
    if (!res.ok) {
      throw new Error(`PyPI responded with HTTP ${res.status}`);
    }

    const data = await res.json() as {
      info?: Record<string, unknown>;
      releases?: Record<string, Array<{ upload_time?: string }>>;
    };

    // PyPI retired its bulk stats endpoint; pypistats.org provides recent download counts
    let downloads: number | undefined;
    try {
      const statsRes = await fetch(
        `https://pypistats.org/api/packages/${encodeURIComponent(packageName)}/recent`
      );
      if (statsRes.ok) {
        const statsData = await statsRes.json() as { data?: { last_month?: number } };
        downloads = statsData.data?.last_month;
      }
    } catch {
      // download count is supplementary
    }

    // Find the oldest release upload time as the package creation date
    const allReleaseFiles = Object.values(data.releases ?? {}).flat();
    const firstPublishedAt = allReleaseFiles
      .map((f) => f.upload_time)
      .filter((t): t is string => Boolean(t))
      .sort()[0];

    return {
      exists: true,
      name: packageName,
      publishedAt: firstPublishedAt,
      downloads,
      maintainerActivity: String(data.info?.['version'] ?? ''),
      raw: data,
    };
  } catch (err) {
    return { exists: undefined, name: packageName, raw: { error: String(err) } };
  }
}
