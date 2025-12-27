/**
 * Git sync status using stoplight colors
 */
export type SyncStatus = 'green' | 'yellow' | 'red';

/**
 * Raw git status data
 */
export interface GitStatus {
  ahead: number;
  behind: number;
  dirty: boolean;
  ts: number; // timestamp of last check
}

/**
 * A branch within a worktree project
 */
export interface Branch {
  name: string;
  path: string;
  status: GitStatus;
  locked?: boolean;
  isCurrent?: boolean;
  isMain?: boolean;
  merged?: boolean;
  hasUncommitted?: boolean;
  showCleanupIcon?: boolean;
  cleanupIconType?: 'broom' | 'pencil' | null;
}

/**
 * Hierarchical node for scoped branch display
 */
export interface ScopeNode {
  name: string;
  children: ScopeNode[];
  branch?: Branch; // leaf node has branch
}

/**
 * A worktree project (collection of branches)
 */
export interface Project {
  id: string;
  name: string;
  root: string; // bare repo or main worktree path
  branches: Branch[];
  status?: ProjectStatus;
  lastUpdated?: number;
}

/**
 * User configuration
 */
export interface Config {
  scopeDelim: string; // default '/'
  scopeEnabled: boolean;
  projects: Project[];
}

/**
 * Discovered worktree candidate
 */
export interface WorktreeCandidate {
  path: string;
  name: string;
  branchCount: number;
}

/**
 * Cached scan results (stored separately for scalability)
 */
export interface ScanCache {
  ts: number;
  candidates: WorktreeCandidate[];
}

/**
 * Project status for error tracking
 */
export type ProjectStatus = 'ok' | 'error' | 'refreshing';

/**
 * Convert GitStatus to stoplight color
 */
export function toSyncStatus(s: GitStatus): SyncStatus {
  if (s.behind > 0) return 'red';
  if (s.dirty) return 'yellow';
  return 'green';
}

/**
 * Create default config
 */
export function defaultConfig(): Config {
  return {
    scopeDelim: '/',
    scopeEnabled: true,
    projects: [],
  };
}

/**
 * Generate unique ID
 */
export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Platform-specific operations that differ between Electron and CLI
 */
export interface PlatformAdapter {
  openPath(path: string): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
  trashItem(path: string): Promise<void>;
  openTerminal(path: string): Promise<void>;
  getDocumentsPath(): string;
  quit(): void;
}

/**
 * Identify worktrees that can be safely deleted (not main, not locked, not current)
 * If type is 'broom', only include those with cleanupIconType === 'broom'
 */
export function getCleanupItems(
  projects: Project[],
  type: 'broom' | 'trash'
): { root: string; path: string; force: boolean; useTrash: boolean }[] {
  const items: { root: string; path: string; force: boolean; useTrash: boolean }[] = [];
  projects.forEach((p) => {
    p.branches.forEach((br) => {
      // Never delete main, current, or locked worktrees
      const isProtected = br.isMain || br.isCurrent || br.locked;
      if (isProtected) return;

      if (type === 'broom') {
        if (br.cleanupIconType === 'broom') {
          items.push({ root: p.root, path: br.path, force: false, useTrash: false });
        }
      } else {
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
