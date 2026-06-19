"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blocklistCheck = void 0;
const blocklist_json_1 = __importDefault(require("../../data/blocklist.json"));
const BLOCKED = new Set(blocklist_json_1.default);
exports.blocklistCheck = {
    name: 'blocklist',
    run: (_meta, identifier) => {
        const blocked = BLOCKED.has(identifier.toLowerCase());
        return {
            checkName: 'blocklist',
            passed: !blocked,
            weight: blocked ? 100 : 0,
            reason: blocked
                ? `"${identifier}" is on the known-malicious blocklist`
                : 'Not on blocklist',
        };
    },
};
//# sourceMappingURL=blocklist.js.map