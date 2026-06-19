"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.existenceCheck = void 0;
exports.existenceCheck = {
    name: 'existence',
    run: (meta) => {
        if (meta.exists === undefined) {
            return {
                checkName: 'existence',
                passed: false,
                weight: 50,
                reason: 'Registry unreachable — could not verify package existence',
            };
        }
        return {
            checkName: 'existence',
            passed: meta.exists,
            weight: meta.exists ? 0 : 100,
            reason: meta.exists
                ? 'Package resolves on registry'
                : 'Package not found on registry — likely hallucinated',
        };
    },
};
//# sourceMappingURL=existence.js.map