"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNpmMetadata = fetchNpmMetadata;
async function fetchNpmMetadata(packageName) {
    try {
        const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
        if (res.status === 404) {
            return { exists: false, name: packageName };
        }
        if (!res.ok) {
            throw new Error(`registry responded with HTTP ${res.status}`);
        }
        const data = await res.json();
        const distTags = data['dist-tags'];
        const latest = distTags?.latest;
        const time = data['time'];
        const publishedAt = latest ? time?.[latest] : time?.['created'];
        let downloads;
        try {
            const dlRes = await fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(packageName)}`);
            if (dlRes.ok) {
                const dlData = await dlRes.json();
                downloads = dlData.downloads;
            }
        }
        catch {
            // download count is supplementary — don't fail the scan
        }
        const versions = data['versions'];
        const latestPkgJson = latest && versions ? versions[latest] : undefined;
        return {
            exists: true,
            name: packageName,
            publishedAt,
            downloads: downloads ?? 0,
            maintainerActivity: publishedAt,
            raw: latestPkgJson ?? data,
        };
    }
    catch (err) {
        // Network failure — unknown state, not a definitive 404
        return { exists: undefined, name: packageName, raw: { error: String(err) } };
    }
}
//# sourceMappingURL=npm.js.map