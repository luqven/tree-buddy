"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSyncStatus = toSyncStatus;
exports.defaultConfig = defaultConfig;
exports.genId = genId;
exports.getCleanupItems = getCleanupItems;
/**
 * Convert GitStatus to stoplight color
 */
function toSyncStatus(s) {
    if (s.behind > 0)
        return 'red';
    if (s.dirty)
        return 'yellow';
    return 'green';
}
/**
 * Create default config
 */
function defaultConfig() {
    return {
        scopeDelim: '/',
        scopeEnabled: true,
        projects: [],
    };
}
/**
 * Generate unique ID
 */
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
/**
 * Identify worktrees that can be safely deleted (not main, not locked, not current)
 * If type is 'broom', only include those with cleanupIconType === 'broom'
 */
function getCleanupItems(projects, type) {
    const items = [];
    projects.forEach((p) => {
        p.branches.forEach((br) => {
            // Never delete main, current, or locked worktrees
            const isProtected = br.isMain || br.isCurrent || br.locked;
            if (isProtected)
                return;
            if (type === 'broom') {
                if (br.cleanupIconType === 'broom') {
                    items.push({ root: p.root, path: br.path, force: false, useTrash: false });
                }
            }
            else {
                // trash deletes all unprotected, uses the fast "bumblebee" trash approach
                items.push({
                    root: p.root,
                    path: br.path,
                    force: !!br.hasUncommitted,
                    useTrash: true
                });
            }
        });
    });
    return items;
}
//# sourceMappingURL=types.js.map