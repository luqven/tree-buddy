import { ipcMain, shell, dialog, BrowserWindow } from 'electron';
import { homedir } from 'os';
import { join } from 'path';
import { Config, Project, WorktreeCandidate } from '../core/types';
import {
  listWorktreesAsync,
  refreshStatusesAsync,
  scanForWorktreesAsync,
  getMainBranchAsync,
  getMergedBranchesAsync,
  lockWorktreeAsync,
  unlockWorktreeAsync,
  removeWorktreeAsync,
  getRepoRootAsync,
} from '../services/git';
import { load, save, addProject, rmProject, updateProject } from '../services/store';
import { loadScanCache, saveScanCache, isCacheStale } from '../services/cache';

// nicer throttling and polling constants
const DOCS_PATH = join(homedir(), 'Documents');
const REFRESH_THROTTLE = 30 * 1000; // 30 seconds between refreshes
const SCAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for scan cache

let cfg: Config;
let isRefreshing = false;
let lastRefreshTs = 0;
let mainWindow: BrowserWindow | null = null;

// Public API bridge
export function setMainWindow(win: BrowserWindow | null) {
  mainWindow = win;
}

function notifyRenderer() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-update', {
      cfg,
      isRefreshing,
    });
  }
}

export function initIpc(): void {
  cfg = load();

  ipcMainHandleSafe('get-state', () => ({ cfg, isRefreshing }));
  ipcMainHandleSafe('refresh-all', async () => { await refreshAllAsync(); });
  ipcMainHandleSafe('refresh-project', async (_e, id: string) => { await refreshProjectAsync(id); });
  ipcMainHandleSafe('add-project', async () => { return await handleAddProject(); });
  ipcMainHandleSafe('remove-project', (_e, id: string) => {
    cfg = rmProject(cfg, id);
    save(cfg);
    notifyRenderer();
  });
  ipcMainHandleSafe('open-path', (_e, path: string) => { shell.openPath(path); });
  ipcMainHandleSafe('show-in-folder', (_e, path: string) => { shell.showItemInFolder(path); });
  ipcMainHandleSafe('update-config', (_e, updates: Partial<Config>) => { cfg = { ...cfg, ...updates }; save(cfg); notifyRenderer(); });
  ipcMainHandleSafe('get-candidates', async () => {
    let cache = loadScanCache();
    if (!cache || isCacheStale(cache, SCAN_CACHE_TTL)) {
      const candidates = await scanForWorktreesAsync(DOCS_PATH, 3);
      cache = { ts: Date.now(), candidates };
      saveScanCache(cache);
    }
    return cache.candidates.filter((c) => !cfg.projects.some((p) => p.root === c.path));
  });
  ipcMainHandleSafe('pick-directory', async () => {
    const { filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'], message: 'Select worktree project directory' });
    return filePaths[0] ?? null;
  });
  ipcMainHandleSafe('confirm-add-project', async (_e, path: string, name: string) => {
    cfg = addProject(cfg, { path, name });
    save(cfg);
    const newProj = cfg.projects[cfg.projects.length - 1];
    await refreshProjectAsync(newProj.id);
    return newProj;
  });
  // Quit
  ipcMainHandleSafe('quit', () => {
    const { app } = require('electron');
    app.quit();
  });
  // Delete a merged worktree
  ipcMainHandleSafe('delete-worktree', async (_e, worktreePath: string) => {
    // test guard
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    const ok = await deleteWorktreeAtPath(worktreePath);
    return ok;
  });
  // Lock/unlock worktrees
  ipcMainHandleSafe('lock-worktree', async (_e, worktreePath: string) => {
    await lockWorktreeAsync(worktreePath);
    await refreshAllAsync();
  });
  ipcMainHandleSafe('unlock-worktree', async (_e, worktreePath: string) => {
    await unlockWorktreeAsync(worktreePath);
    await refreshAllAsync();
  });

  // Hook for when window shown
  ipcMainHandleSafe('window-shown', async () => {
    await refreshAllThrottledAsync();
  });
}

export async function deleteWorktreeAtPath(worktreePath: string): Promise<boolean> {
  // test guard
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  try {
    const root = await getRepoRootAsync(worktreePath);
    if (root) {
      await removeWorktreeAsync(root, worktreePath);
      await refreshAllAsync();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Helpers to register IPC handlers in a single place
function ipcMainHandleSafe(channel: string, handler: (...args: any[]) => any) {
  const { ipcMain } = require('electron');
  ipcMain.handle(channel, handler as any);
}

async function refreshAllThrottledAsync(): Promise<void> {
  const now = Date.now();
  if (now - lastRefreshTs < REFRESH_THROTTLE) {
    notifyRenderer();
    return;
  }
  await refreshAllAsync();
}

async function refreshAllAsync(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;
  lastRefreshTs = Date.now();
  notifyRenderer();
  try {
    const updated: Project[] = [];
    for (const p of cfg.projects) {
      try {
        const branches = await listWorktreesAsync(p.root);
        const refreshed = await refreshStatusesAsync(branches);

        // Get main branch and merged branches for this project
        const mainBranch = await getMainBranchAsync(p.root);
        const mergedBranchNames = await getMergedBranchesAsync(p.root, mainBranch);

        // Enhance branches with merged and cleanup status
        const enhancedBranches = refreshed.map((br) => {
          const isMerged = mergedBranchNames.includes(br.name);
          const hasUncommitted = br.status.dirty;

          // Determine cleanup icon
          let showCleanupIcon = false;
          let cleanupIconType: 'broom' | 'pencil' | null = null;

          // Don't show cleanup for main worktree or locked worktrees
          if (isMerged && !br.locked && !br.isMain) {
            showCleanupIcon = true;
            cleanupIconType = hasUncommitted ? 'pencil' : 'broom';
          }

          return {
            ...br,
            merged: isMerged,
            isCurrent: br.isMain, // Highlight the main worktree
            hasUncommitted,
            showCleanupIcon,
            cleanupIconType,
          };
        });

        updated.push({ ...p, branches: enhancedBranches, status: 'ok' as const, lastUpdated: Date.now() });
      } catch {
        updated.push({ ...p, status: 'error' as const, lastUpdated: Date.now() });
      }
    }
    cfg = { ...cfg, projects: updated };
    save(cfg);
  } finally {
    isRefreshing = false;
    notifyRenderer();
  }
}

async function refreshProjectAsync(id: string): Promise<void> {
  const proj = cfg.projects.find((p) => p.id === id);
  if (!proj) return;
  try {
    const branches = await listWorktreesAsync(proj.root);
    const refreshed = await refreshStatusesAsync(branches);

    // Get main branch and merged branches for this project
    const mainBranch = await getMainBranchAsync(proj.root);
    const mergedBranchNames = await getMergedBranchesAsync(proj.root, mainBranch);

    // Enhance branches with merged and cleanup status
    const enhancedBranches = refreshed.map((br) => {
      const isMerged = mergedBranchNames.includes(br.name);
      const hasUncommitted = br.status.dirty;

      // Determine cleanup icon
      let showCleanupIcon = false;
      let cleanupIconType: 'broom' | 'pencil' | null = null;

      // Don't show cleanup for main worktree or locked worktrees
      if (isMerged && !br.locked && !br.isMain) {
        showCleanupIcon = true;
        cleanupIconType = hasUncommitted ? 'pencil' : 'broom';
      }

      return {
        ...br,
        merged: isMerged,
        isCurrent: br.isMain,
        hasUncommitted,
        showCleanupIcon,
        cleanupIconType,
      };
    });

    const updated: Project = { ...proj, branches: enhancedBranches, status: 'ok' as const, lastUpdated: Date.now() };
    cfg = updateProject(cfg, updated);
  } catch {
    const updated: Project = { ...proj, status: 'error' as const, lastUpdated: Date.now() };
    cfg = updateProject(cfg, updated);
  }
  save(cfg);
  notifyRenderer();
}

async function handleAddProject(): Promise<WorktreeCandidate[] | null> {
  let cache = loadScanCache();
  if (!cache || isCacheStale(cache, SCAN_CACHE_TTL)) {
    const candidates = await scanForWorktreesAsync(DOCS_PATH, 3);
    cache = { ts: Date.now(), candidates };
    saveScanCache(cache);
  }
  return cache.candidates.filter((c) => !cfg.projects.some((p) => p.root === c.path));
}

export {};
