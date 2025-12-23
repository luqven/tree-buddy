import { contextBridge, ipcRenderer } from 'electron';
import type { Config, WorktreeCandidate, Project } from '../core/types';

export interface AppState {
  cfg: Config;
  isRefreshing: boolean;
}

export interface TreeBuddyAPI {
  getState: () => Promise<AppState>;
  refreshAll: () => Promise<void>;
  refreshProject: (id: string) => Promise<void>;
  addProject: () => Promise<WorktreeCandidate[] | null>;
  removeProject: (id: string) => Promise<void>;
  openPath: (path: string) => Promise<void>;
  showInFolder: (path: string) => Promise<void>;
  updateConfig: (updates: Partial<Config>) => Promise<void>;
  getCandidates: () => Promise<WorktreeCandidate[]>;
  pickDirectory: () => Promise<string | null>;
  confirmAddProject: (path: string, name: string) => Promise<Project>;
  quit: () => Promise<void>;
  deleteWorktree: (root: string, path: string, force?: boolean, useTrash?: boolean) => Promise<boolean>;
  deleteWorktrees: (items: { root: string; path: string; force?: boolean; useTrash?: boolean }[]) => Promise<boolean>;
  lockWorktree: (path: string) => Promise<void>;
  unlockWorktree: (path: string) => Promise<void>;
  windowShown: () => Promise<void>;
  onStateUpdate: (cb: (state: AppState) => void) => () => void;
  onDeletionProgress: (cb: (data: { path: string; status: 'started' | 'finished' | 'failed' }) => void) => () => void;
}

const api: TreeBuddyAPI = {
  getState: () => ipcRenderer.invoke('get-state'),
  refreshAll: () => ipcRenderer.invoke('refresh-all'),
  refreshProject: (id) => ipcRenderer.invoke('refresh-project', id),
  addProject: () => ipcRenderer.invoke('add-project'),
  removeProject: (id) => ipcRenderer.invoke('remove-project', id),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  showInFolder: (path) => ipcRenderer.invoke('show-in-folder', path),
  updateConfig: (updates) => ipcRenderer.invoke('update-config', updates),
  getCandidates: () => ipcRenderer.invoke('get-candidates'),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  confirmAddProject: (path, name) => ipcRenderer.invoke('confirm-add-project', path, name),
  quit: () => ipcRenderer.invoke('quit'),
  deleteWorktree: (root, path, force, useTrash) => ipcRenderer.invoke('delete-worktree', root, path, force, useTrash),
  deleteWorktrees: (items) => ipcRenderer.invoke('delete-worktrees', items),
  lockWorktree: (path) => ipcRenderer.invoke('lock-worktree', path),
  unlockWorktree: (path) => ipcRenderer.invoke('unlock-worktree', path),
  windowShown: () => ipcRenderer.invoke('window-shown'),
  onStateUpdate: (cb) => {
    const handler = (_e: Electron.IpcRendererEvent, state: AppState) => cb(state);
    ipcRenderer.on('state-update', handler);
    return () => ipcRenderer.removeListener('state-update', handler);
  },
  onDeletionProgress: (cb) => {
    const handler = (_e: Electron.IpcRendererEvent, data: any) => cb(data);
    ipcRenderer.on('deletion-progress', handler);
    return () => ipcRenderer.removeListener('deletion-progress', handler);
  },
};

contextBridge.exposeInMainWorld('treeBuddy', api);

declare global {
  interface Window {
    treeBuddy: TreeBuddyAPI;
  }
}
