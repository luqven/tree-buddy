"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    getState: () => electron_1.ipcRenderer.invoke('get-state'),
    refreshAll: () => electron_1.ipcRenderer.invoke('refresh-all'),
    refreshProject: (id) => electron_1.ipcRenderer.invoke('refresh-project', id),
    addProject: () => electron_1.ipcRenderer.invoke('add-project'),
    removeProject: (id) => electron_1.ipcRenderer.invoke('remove-project', id),
    openPath: (path) => electron_1.ipcRenderer.invoke('open-path', path),
    showInFolder: (path) => electron_1.ipcRenderer.invoke('show-in-folder', path),
    openInTerminal: (path) => electron_1.ipcRenderer.invoke('open-in-terminal', path),
    updateConfig: (updates) => electron_1.ipcRenderer.invoke('update-config', updates),
    getCandidates: () => electron_1.ipcRenderer.invoke('get-candidates'),
    pickDirectory: () => electron_1.ipcRenderer.invoke('pick-directory'),
    confirmAddProject: (path, name) => electron_1.ipcRenderer.invoke('confirm-add-project', path, name),
    quit: () => electron_1.ipcRenderer.invoke('quit'),
    deleteWorktree: (root, path, force, useTrash) => electron_1.ipcRenderer.invoke('delete-worktree', root, path, force, useTrash),
    deleteWorktrees: (items) => electron_1.ipcRenderer.invoke('delete-worktrees', items),
    lockWorktree: (path) => electron_1.ipcRenderer.invoke('lock-worktree', path),
    unlockWorktree: (path) => electron_1.ipcRenderer.invoke('unlock-worktree', path),
    windowShown: () => electron_1.ipcRenderer.invoke('window-shown'),
    onStateUpdate: (cb) => {
        const handler = (_e, state) => cb(state);
        electron_1.ipcRenderer.on('state-update', handler);
        return () => electron_1.ipcRenderer.removeListener('state-update', handler);
    },
    onDeletionProgress: (cb) => {
        const handler = (_e, data) => cb(data);
        electron_1.ipcRenderer.on('deletion-progress', handler);
        return () => electron_1.ipcRenderer.removeListener('deletion-progress', handler);
    },
};
electron_1.contextBridge.exposeInMainWorld('treeBuddy', api);
//# sourceMappingURL=preload.js.map