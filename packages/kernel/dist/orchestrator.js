"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scan = scan;
const existence_1 = require("./checks/existence");
const age_1 = require("./checks/age");
const lookalike_1 = require("./checks/lookalike");
const adoption_1 = require("./checks/adoption");
const blocklist_1 = require("./checks/blocklist");
const permissions_1 = require("./checks/permissions");
const npm_1 = require("./registries/npm");
const pypi_1 = require("./registries/pypi");
const mcp_1 = require("./registries/mcp");
async function fetchMetadata(identifier, ecosystem) {
    switch (ecosystem) {
        case 'npm': return (0, npm_1.fetchNpmMetadata)(identifier);
        case 'pypi': return (0, pypi_1.fetchPypiMetadata)(identifier);
        case 'mcp': return (0, mcp_1.fetchMcpMetadata)(identifier);
    }
}
async function scan(identifier, ecosystem) {
    const meta = await fetchMetadata(identifier, ecosystem);
    const baseChecks = [
        existence_1.existenceCheck,
        age_1.ageCheck,
        (0, lookalike_1.createLookalikeCheck)(ecosystem),
        adoption_1.adoptionCheck,
        blocklist_1.blocklistCheck,
    ];
    const applicableChecks = ecosystem === 'mcp'
        ? [...baseChecks, permissions_1.permissionsCheck]
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
//# sourceMappingURL=orchestrator.js.map