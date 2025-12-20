import { ipcMain, shell, dialog, BrowserWindow } from 'electron';
import { homedir } from 'os';
import { join } from 'path';
import { Config, Project, WorktreeCandidate } from '../core/types';
import {
  listWorktreesAsync,
  refreshStatusesAsync,
  scanForWorktreesAsync,
} from '../services/git';
import { load, save, addProject, rmProject, updateProject } from '../services/store';
import { loadScanCache, saveScanCache, isCacheStale } from '../services/cache';

const DOCS_PATH = join(homedir(), 'Documents');
const REFRESH_THROTTLE = 30 * 1000; // 30 seconds minimum between refreshes
const SCAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for scan cache

let cfg: Config;
let isRefreshing = false;
let lastRefreshTs = 0;
let mainWindow: BrowserWindow | null = null;

/**
 * Refresh all project statuses (with per-branch merged hint)
 */
async function refreshAllAsync(): Promise<void> {
  const { execSync } = require('child_process');
  if (isRefreshing) return;
  isRefreshing = true;
  lastRefreshTs = Date.now();
  notifyRenderer();

  try {
    const updated = await Promise.all(
      cfg.projects.map(async (p) => {
        try {
          const branches = await listWorktreesAsync(p.root);
          const refreshed = await refreshStatusesAsync(branches);
          // compute per-branch merged flag
          const mergedFlags = refreshed.map(() => {
            try {
              const head = execSync('git rev-parse HEAD', { cwd: p.root }).toString().trim();
              execSync(`git merge-base --is-ancestor ${head} main`, { cwd: p.root });
              return true;
            } catch {
              return false;
            }
          });
          const branchesWithMerged = refreshed.map((br, idx) => ({ ...br, merged: mergedFlags[idx] }));
          return { ...p, branches: branchesWithMerged, status: 'ok' as const, lastUpdated: Date.now() };
        } catch {
          return { ...p, status: 'error' as const, lastUpdated: Date.now() };
        }
      })
    );
    cfg = { ...cfg, projects: updated };
    save(cfg);
  } finally {
    isRefreshing = false;
    notifyRenderer();
  }
}

/**
 * Send state update to renderer
 */
function notifyRenderer() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-update', {
      cfg,
      isRefreshing,
    });
  }
}

/**
 * Initialize IPC handlers
 */
export function initIpc(): void {
  cfg = load();

  // Get current state
  ipcMain.handle('get-state', () => ({
    cfg,
    isRefreshing,
  }));

  // Refresh all projects
  ipcMain.handle('refresh-all', async () => {
    await refreshAllAsync();
  });

  // Refresh single project
  ipcMain.handle('refresh-project', async (_e, id: string) => {
    await refreshProjectAsync(id);
  });

  // Add project
  ipcMain.handle('add-project', async () => {
    return await handleAddProject();
  });

  // Remove project
  ipcMain.handle('remove-project', (_e, id: string) => {
    cfg = rmProject(cfg, id);
    save(cfg);
    notifyRenderer();
  });

  // Open path in finder
  ipcMain.handle('open-path', (_e, path: string) => {
    shell.openPath(path);
  });

  // Open path in finder (show in folder)
  ipcMain.handle('show-in-folder', (_e, path: string) => {
    shell.showItemInFolder(path);
  });

  // Update config
  ipcMain.handle('update-config', (_e, updates: Partial<Config>) => {
    cfg = { ...cfg, ...updates };
    save(cfg);
    notifyRenderer();
  });

  // Get worktree candidates for discovery
  ipcMain.handle('get-candidates', async () => {
    let cache = loadScanCache();

    if (!cache || isCacheStale(cache, SCAN_CACHE_TTL)) {
      const candidates = await scanForWorktreesAsync(DOCS_PATH, 3);
      cache = { ts: Date.now(), candidates };
      saveScanCache(cache);
    }

    return cache.candidates.filter(
      (c) => !cfg.projects.some((p) => p.root === c.path)
    );
  });

  // Show directory picker
  ipcMain.handle('pick-directory', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: 'Select worktree project directory',
    });
    return filePaths[0] ?? null;
  });

  // Confirm add project with name
  ipcMain.handle('confirm-add-project', async (_e, path: string, name: string) => {
    cfg = addProject(cfg, { path, name });
    save(cfg);

    const newProj = cfg.projects[cfg.projects.length - 1];
    await refreshProjectAsync(newProj.id);
    return newProj;
  });

  // Quit app
  ipcMain.handle('quit', () => {
    const { app } = require('electron');
    app.quit();
  });
 
  // Refresh on window show (throttled)
  ipcMain.handle('window-shown', async () => {
    await refreshAllThrottledAsync();
  });
 
  // Delete a merged worktree
  ipcMain.handle('delete-worktree', async (_e, worktreePath: string) => {
    try {
      const { execSync } = require('child_process');
      // determine root from the worktree path
      let root = '';
      try {
        root = execSync(`git -C "${worktreePath}" rev-parse --show-toplevel`).toString().trim();
      } catch {
        // if cannot determine, fail gracefully
        return false;
      }
      if (root) {
        execSync(`git -C "${root}" worktree remove "${worktreePath}"`, { stdio: 'ignore' });
        // refresh project containing this worktree if possible
        const proj = cfg?.projects?.find((p) => p.branches?.some((b) => b.path === worktreePath));
        if (proj) {
          await refreshProjectAsync(proj.id);
        } else {
          await refreshAllAsync();
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });
 
  // Ensure lastUpdated timestamps exist on initial load? (no-op)
}

/**
 * Refresh all project statuses (throttled version for window open)
 */
async function refreshAllThrottledAsync(): Promise<void> {
  const now = Date.now();
  if (now - lastRefreshTs < REFRESH_THROTTLE) {
    // Too soon, skip refresh but still notify with cached state
    notifyRenderer();
    return;
  }
  await refreshAllAsync();
}

/**
 * Refresh all project statuses
 */
async function refreshAllAsync(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;
  lastRefreshTs = Date.now();
  notifyRenderer();

  try {
    const updated = await Promise.all(
      cfg.projects.map(async (p) => {
        try {
          const branches = await listWorktreesAsync(p.root);
          const refreshed = await refreshStatusesAsync(branches);
          return { ...p, branches: refreshed, status: 'ok' as const };
        } catch {
          return { ...p, status: 'error' as const, lastUpdated: Date.now() };
        }
      })
    );
    cfg = { ...cfg, projects: updated };
    save(cfg);
  } finally {
    isRefreshing = false;
    notifyRenderer();
  }
}

/**
 * Refresh single project
 */
async function refreshProjectAsync(id: string): Promise<void> {
  const proj = cfg.projects.find((p) => p.id === id);
  if (!proj) return;

  try {
    const branches = await listWorktreesAsync(proj.root);
    const refreshed = await refreshStatusesAsync(branches);
    const updated: Project = { ...proj, branches: refreshed, status: 'ok', lastUpdated: Date.now() };
    cfg = updateProject(cfg, updated);
  } catch {
    const updated: Project = { ...proj, status: 'error' };
    cfg = updateProject(cfg, updated);
  }

  save(cfg);
  notifyRenderer();
}

/**
 * Handle add project flow (legacy dialog approach)
 */
async function handleAddProject(): Promise<WorktreeCandidate[] | null> {
  let cache = loadScanCache();

  if (!cache || isCacheStale(cache, SCAN_CACHE_TTL)) {
    const candidates = await scanForWorktreesAsync(DOCS_PATH, 3);
    cache = { ts: Date.now(), candidates };
    saveScanCache(cache);
  }

  return cache.candidates.filter(
    (c) => !cfg.projects.some((p) => p.root === c.path)
  );
}
