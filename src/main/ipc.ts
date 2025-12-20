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
    try {
      const { execSync } = require('child_process');
      const root = execSync(`git -C \"${worktreePath}\" rev-parse --show-toplevel`).toString().trim();
      if (root) {
        execSync(`git -C \"${root}\" worktree remove \"${worktreePath}\"`, { stdio: 'ignore' });
        // refresh state after deletion
        await refreshAllAsync();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  // Hook for when window shown
  ipcMainHandleSafe('window-shown', async () => {
    await refreshAllThrottledAsync();
  });
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
    const updated = await Promise.all(
      cfg.projects.map(async (p) => {
        try {
          const branches = await listWorktreesAsync(p.root);
          const refreshed = await refreshStatusesAsync(branches);
          const branchesWithMerged = refreshed.map((br) => ({ ...br, merged: !!br }));
          return { ...p, branches: branchesWithMerged, status: 'ok', lastUpdated: Date.now() };
        } catch {
          return { ...p, status: 'error', lastUpdated: Date.now() };
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

async function refreshProjectAsync(id: string): Promise<void> {
  const proj = cfg.projects.find((p) => p.id === id);
  if (!proj) return;
  try {
    const branches = await listWorktreesAsync(proj.root);
    const refreshed = await refreshStatusesAsync(branches);
    const updated: Project = { ...proj, branches: refreshed, status: 'ok', lastUpdated: Date.now() };
    cfg = updateProject(cfg, updated);
  } catch {
    const updated: Project = { ...proj, status: 'error', lastUpdated: Date.now() };
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
