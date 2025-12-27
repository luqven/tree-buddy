import { Config, Project, WorktreeCandidate, PlatformAdapter, Branch } from '../core/types.js';
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
} from './git.js';
import { load, save, addProject, rmProject, updateProject } from './store.js';
import { loadScanCache, saveScanCache, isCacheStale } from './cache.js';
import { log, logError } from '../main/logger.js';

export interface AppState {
  cfg: Config;
  isRefreshing: boolean;
}

const REFRESH_THROTTLE = 30 * 1000;
const SCAN_CACHE_TTL = 5 * 60 * 1000;

export class AppService {
  private cfg: Config;
  private isRefreshing = false;
  private isBulkOperating = false;
  private lastRefreshTs = 0;
  private listeners: ((state: AppState) => void)[] = [];
  private adapter: PlatformAdapter;

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
    this.cfg = load();
  }

  subscribe(l: (state: AppState) => void) {
    this.listeners.push(l);
    l(this.getState());
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }

  getState(): AppState {
    return {
      cfg: this.cfg,
      isRefreshing: this.isRefreshing || this.isBulkOperating,
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  async refreshAllThrottled(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastRefreshTs < REFRESH_THROTTLE) {
      this.notify();
      return;
    }
    await this.refreshAll(force);
  }

  async refreshAll(force = false): Promise<void> {
    if (this.isBulkOperating && !force) return;
    if (this.isRefreshing && !force) return;
    
    this.isRefreshing = true;
    this.lastRefreshTs = Date.now();
    this.notify();

    try {
      const updated: Project[] = [];
      for (const p of this.cfg.projects) {
        try {
          const enhancedBranches = await this.fetchEnhancedBranches(p.root);
          updated.push({ 
            ...p, 
            branches: enhancedBranches, 
            status: 'ok', 
            lastUpdated: Date.now() 
          });
        } catch (err) {
          logError(`[AppService] error updating project ${p.name}:`, err);
          updated.push({ ...p, status: 'error', lastUpdated: Date.now() });
        }
      }
      this.cfg = { ...this.cfg, projects: updated };
      save(this.cfg);
    } finally {
      this.isRefreshing = false;
      this.notify();
    }
  }

  async refreshProject(id: string): Promise<void> {
    const proj = this.cfg.projects.find((p) => p.id === id);
    if (!proj) return;

    try {
      const enhancedBranches = await this.fetchEnhancedBranches(proj.root);
      const updated: Project = { 
        ...proj, 
        branches: enhancedBranches, 
        status: 'ok', 
        lastUpdated: Date.now() 
      };
      this.cfg = updateProject(this.cfg, updated);
    } catch {
      const updated: Project = { ...proj, status: 'error', lastUpdated: Date.now() };
      this.cfg = updateProject(this.cfg, updated);
    }
    save(this.cfg);
    this.notify();
  }

  private async fetchEnhancedBranches(root: string): Promise<Branch[]> {
    const branches = await listWorktreesAsync(root);
    const refreshed = await refreshStatusesAsync(branches);
    const mainBranch = await getMainBranchAsync(root);
    const mergedBranchNames = await getMergedBranchesAsync(root, mainBranch);

    return refreshed.map((br) => {
      const isMerged = mergedBranchNames.includes(br.name);
      const hasUncommitted = br.status.dirty;

      let showCleanupIcon = false;
      let cleanupIconType: 'broom' | 'pencil' | null = null;

      if (hasUncommitted) {
        showCleanupIcon = true;
        cleanupIconType = 'pencil';
      } else if (isMerged && !br.locked && !br.isMain) {
        showCleanupIcon = true;
        cleanupIconType = 'broom';
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
  }

  async getCandidates(): Promise<WorktreeCandidate[]> {
    let cache = loadScanCache();
    if (!cache || isCacheStale(cache, SCAN_CACHE_TTL)) {
      const candidates = await scanForWorktreesAsync(this.adapter.getDocumentsPath(), 3);
      cache = { ts: Date.now(), candidates };
      saveScanCache(cache);
    }
    return cache.candidates.filter((c) => !this.cfg.projects.some((p) => p.root === c.path));
  }

  async confirmAddProject(path: string, name: string): Promise<Project> {
    this.cfg = addProject(this.cfg, { path, name });
    save(this.cfg);
    const newProj = this.cfg.projects[this.cfg.projects.length - 1];
    await this.refreshProject(newProj.id);
    return newProj;
  }

  removeProject(id: string) {
    this.cfg = rmProject(this.cfg, id);
    save(this.cfg);
    this.notify();
  }

  updateConfig(updates: Partial<Config>) {
    this.cfg = { ...this.cfg, ...updates };
    save(this.cfg);
    this.notify();
  }

  async lockWorktree(worktreePath: string) {
    await lockWorktreeAsync(worktreePath);
    await this.refreshAll();
  }

  async unlockWorktree(worktreePath: string) {
    await unlockWorktreeAsync(worktreePath);
    await this.refreshAll();
  }

  async deleteWorktrees(items: { root: string; path: string; force?: boolean; useTrash?: boolean }[], onProgress?: (data: { path: string; status: 'started' | 'finished' | 'failed' }) => void): Promise<boolean> {
    this.isBulkOperating = true;
    this.notify();

    let allOk = true;
    try {
      const uniqueRoots = Array.from(new Set(items.map(i => i.root)));

      for (const item of items) {
        try {
          onProgress?.({ path: item.path, status: 'started' });
          
          if (item.useTrash) {
            await this.adapter.trashItem(item.path);
          } else {
            await removeWorktreeAsync(item.root, item.path, !!item.force);
          }
          
          onProgress?.({ path: item.path, status: 'finished' });
        } catch (err: any) {
          onProgress?.({ path: item.path, status: 'failed' });
          if (err.stderr && (err.stderr.includes('is not a working tree') || err.stderr.includes('does not exist'))) {
            // ignore
          } else {
            logError(`[AppService] failed to remove worktree ${item.path}:`, err);
            allOk = false;
          }
        }
      }

      for (const root of uniqueRoots) {
        try {
          await pruneWorktreesAsync(root);
        } catch (err) {
          logError(`[AppService] failed to prune worktrees in ${root}`, err);
        }
      }
    } finally {
      this.isBulkOperating = false;
    }

    await this.refreshAll(true);
    return allOk;
  }

  openPath(path: string) { return this.adapter.openPath(path); }
  showInFolder(path: string) { return this.adapter.showItemInFolder(path); }
  openInTerminal(path: string) { return this.adapter.openTerminal(path); }
  quit() { this.adapter.quit(); }
}
