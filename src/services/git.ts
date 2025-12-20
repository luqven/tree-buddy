import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { WorktreeCandidate, Branch, GitStatus } from '../core/types';

interface ExecOpts {
  cwd: string;
  timeout?: number;
}

/**
 * Execute git command and return stdout
 */
function git(args: string, opts: ExecOpts): string {
  try {
    const res = execSync(`git ${args}`, {
      cwd: opts.cwd,
      timeout: opts.timeout ?? 5000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return res.trim();
  } catch {
    return '';
  }
}

/**
 * Check if path is a git worktree root (bare repo or has worktrees)
 */
export function isWorktreeRoot(path: string): boolean {
  const gitDir = join(path, '.git');
  const bareHead = join(path, 'HEAD');
  const wt = join(path, 'worktrees');

  // bare repo with worktrees
  if (existsSync(bareHead) && existsSync(wt)) {
    return true;
  }

  // regular repo - check for worktrees dir in .git
  if (existsSync(gitDir)) {
    const gitPath = statSync(gitDir).isDirectory()
      ? gitDir
      : dirname(readFileSync(gitDir, 'utf-8').replace('gitdir: ', '').trim());
    return existsSync(join(gitPath, 'worktrees'));
  }

  return false;
}

/**
 * Check if path is a bare git repo
 */
export function isBareRepo(path: string): boolean {
  return existsSync(join(path, 'HEAD')) && existsSync(join(path, 'objects'));
}

/**
 * Get the main git directory for a worktree
 */
function getGitDir(path: string): string | null {
  const gitFile = join(path, '.git');
  if (!existsSync(gitFile)) {
    return isBareRepo(path) ? path : null;
  }

  const stat = statSync(gitFile);
  if (stat.isDirectory()) {
    return gitFile;
  }

  // .git is a file pointing to actual git dir
  const content = readFileSync(gitFile, 'utf-8').trim();
  const match = content.match(/^gitdir:\s*(.+)$/);
  if (match) {
    const rel = match[1];
    return rel.startsWith('/') ? rel : join(path, rel);
  }
  return null;
}

/**
 * Find the common git dir (bare repo or main .git)
 */
function findCommonDir(path: string): string | null {
  const gd = getGitDir(path);
  if (!gd) return null;

  // Check if this is a worktree pointing to common dir
  const commonFile = join(gd, 'commondir');
  if (existsSync(commonFile)) {
    const rel = readFileSync(commonFile, 'utf-8').trim();
    return rel.startsWith('/') ? rel : join(gd, rel);
  }

  return gd;
}

/**
 * List all worktrees for a git repo
 */
export function listWorktrees(root: string): Branch[] {
  const out = git('worktree list --porcelain', { cwd: root });
  if (!out) return [];

  const branches: Branch[] = [];
  let cur: Partial<Branch> = {};

  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      cur.path = line.slice(9);
    } else if (line.startsWith('branch ')) {
      const ref = line.slice(7);
      cur.name = ref.replace('refs/heads/', '');
    } else if (line === '') {
      if (cur.path && cur.name) {
        branches.push({
          name: cur.name,
          path: cur.path,
          status: { ahead: 0, behind: 0, dirty: false, ts: 0 },
        });
      }
      cur = {};
    }
  }

  // Handle last entry
  if (cur.path && cur.name) {
    branches.push({
      name: cur.name,
      path: cur.path,
      status: { ahead: 0, behind: 0, dirty: false, ts: 0 },
    });
  }

  return branches;
}

/**
 * Get git status for a worktree path
 */
export function getStatus(path: string): GitStatus {
  const ts = Date.now();

  // Check for uncommitted changes
  const diff = git('status --porcelain', { cwd: path });
  const dirty = diff.length > 0;

  // Check ahead/behind
  const ab = git('rev-list --left-right --count @{u}...HEAD', { cwd: path });
  let ahead = 0;
  let behind = 0;

  if (ab) {
    const [b, a] = ab.split(/\s+/).map(Number);
    behind = b || 0;
    ahead = a || 0;
  }

  return { ahead, behind, dirty, ts };
}

/**
 * Scan directory recursively for worktree roots
 */
export function scanForWorktrees(dir: string, maxDepth = 4): WorktreeCandidate[] {
  const results: WorktreeCandidate[] = [];

  function scan(p: string, depth: number) {
    if (depth > maxDepth) return;
    if (!existsSync(p)) return;

    try {
      const stat = statSync(p);
      if (!stat.isDirectory()) return;

      // Skip common non-project dirs
      const name = basename(p);
      if (name.startsWith('.') || name === 'node_modules') return;

      // Check if this is a worktree root
      if (isWorktreeRoot(p) || isBareRepo(p)) {
        const branches = listWorktrees(p);
        if (branches.length > 0) {
          results.push({
            path: p,
            name: basename(p).replace(/\.git$/, ''),
            branchCount: branches.length,
          });
          return; // Don't recurse into git repos
        }
      }

      // Recurse into subdirs
      const entries = readdirSync(p);
      for (const e of entries) {
        scan(join(p, e), depth + 1);
      }
    } catch {
      // Permission denied or other error, skip
    }
  }

  scan(dir, 0);
  return results;
}

/**
 * Refresh status for all branches in a project
 */
export function refreshStatuses(branches: Branch[]): Branch[] {
  return branches.map((b) => ({
    ...b,
    status: getStatus(b.path),
  }));
}
