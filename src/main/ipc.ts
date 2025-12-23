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
  pruneWorktreesAsync,
} from '../services/git';
import { load, save, addProject, rmProject, updateProject } from '../services/store';
import { loadScanCache, saveScanCache, isCacheStale } from '../services/cache';
import { log, logError } from './logger';

// nicer throttling and polling constants
const DOCS_PATH = join(homedir(), 'Documents');
const REFRESH_THROTTLE = 30 * 1000; // 30 seconds between refreshes
const SCAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for scan cache

let cfg: Config;
let isRefreshing = false;
let isBulkOperating = false;
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
      isRefreshing: isRefreshing || isBulkOperating,
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
  ipcMainHandleSafe('delete-worktree', async (_e, root: string, worktreePath: string, force = false) => {
    if (process.env.NODE_ENV === 'test') return true;
    try {
      log(`[ipc] delete-worktree request: ${worktreePath} (force: ${force})`);
      await removeWorktreeAsync(root, worktreePath, force);
      await refreshAllAsync(true);
      return true;
    } catch (err) {
      logError(`[ipc] delete-worktree failed:`, err);
      return false;
    }
  });
  ipcMainHandleSafe('delete-worktrees', async (_e, items: { root: string; path: string; force?: boolean }[]) => {
    log(`[ipc] delete-worktrees request received for ${items.length} items`);
    if (process.env.NODE_ENV === 'test') return true;
    
    isBulkOperating = true;
    notifyRenderer(); // inform UI we are busy

    let allOk = true;
    try {
      // Run prune once at the start to clean up ghost worktrees
      const uniqueRoots = Array.from(new Set(items.map(i => i.root)));
      for (const root of uniqueRoots) {
        try {
          await pruneWorktreesAsync(root);
        } catch (err) {
          logError(`[ipc] failed to prune worktrees in ${root}`, err);
        }
      }

      // Process sequentially to avoid Git index lock contention
      for (const item of items) {
        try {
          log(`[ipc] attempting to remove worktree: ${item.path} from root: ${item.root} (force: ${!!item.force})`);
          
          // Send progress update to renderer so it can update its local "deleting" state
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('deletion-progress', { path: item.path, status: 'started' });
          }

          // Increase timeout for individual removals as they can be slow on disk
          await removeWorktreeAsync(item.root, item.path, !!item.force);
          log(`[ipc] successfully removed worktree: ${item.path}`);
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('deletion-progress', { path: item.path, status: 'finished' });
          }
        } catch (err: any) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('deletion-progress', { path: item.path, status: 'failed' });
          }
          if (err.stderr && (err.stderr.includes('is not a working tree') || err.stderr.includes('does not exist'))) {
            log(`[ipc] worktree already gone: ${item.path}`);
          } else {
            logError(`[ipc] failed to remove worktree ${item.path}:`, err);
            allOk = false;
          }
        }
      }
    } finally {
      isBulkOperating = false;
    }

    log(`[ipc] all deletions finished, triggering refreshAll`);
    await refreshAllAsync(true);
    return allOk;
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

// Helpers to register IPC handlers in a single place
function ipcMainHandleSafe(channel: string, handler: (...args: any[]) => any) {
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

async function refreshAllAsync(force = false): Promise<void> {
  if (isBulkOperating && !force) return;
  if (isRefreshing && !force) return;
  isRefreshing = true;
  lastRefreshTs = Date.now();
  notifyRenderer();
  try {
    const updated: Project[] = [];
    for (const p of cfg.projects) {
      log(`[refresh] starting project: ${p.name} (${p.root})`);
      try {
        const branches = await listWorktreesAsync(p.root);
        log(`[refresh] found ${branches.length} worktrees for ${p.name}`);
        const refreshed = await refreshStatusesAsync(branches);
        log(`[refresh] statuses refreshed for ${p.name}`);

        // Get main branch and merged branches for this project
        const mainBranch = await getMainBranchAsync(p.root);
        log(`[refresh] main branch for ${p.name} is ${mainBranch}`);
        const mergedBranchNames = await getMergedBranchesAsync(p.root, mainBranch);
        log(`[refresh] found ${mergedBranchNames.length} merged branches for ${p.name}`);

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
        log(`[refresh] project ${p.name} updated successfully`);
      } catch (err) {
        logError(`[refresh] error updating project ${p.name}:`, err);
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
