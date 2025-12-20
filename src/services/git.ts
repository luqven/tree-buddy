import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync, statSync, readFileSync, promises as fs } from 'fs';
import { join, basename, dirname } from 'path';
import { WorktreeCandidate, Branch, GitStatus } from '../core/types';

const execAsync = promisify(exec);

interface ExecOpts {
  cwd: string;
  timeout?: number;
}

/**
 * Execute git command synchronously
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
 * Execute git command asynchronously
 */
async function gitAsync(args: string, opts: ExecOpts): Promise<string> {
  try {
    const { stdout } = await execAsync(`git ${args}`, {
      cwd: opts.cwd,
      timeout: opts.timeout ?? 5000,
      encoding: 'utf-8',
    });
    return stdout.trim();
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
  let cur: Partial<Branch & { locked?: boolean }> = {};

  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      cur.path = line.slice(9);
    } else if (line.startsWith('branch ')) {
      const ref = line.slice(7);
      cur.name = ref.replace('refs/heads/', '');
    } else if (line.startsWith('locked')) {
      cur.locked = true;
    } else if (line === '') {
      if (cur.path && cur.name) {
        branches.push({
          name: cur.name,
          path: cur.path,
          status: { ahead: 0, behind: 0, dirty: false, ts: 0 },
          locked: cur.locked || false,
          isMain: branches.length === 0,
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
      locked: cur.locked || false,
      isMain: branches.length === 0,
    });
  }

  return branches;
}

/**
 * Get git status for a worktree path (sync)
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
 * Get git status for a worktree path (async)
 */
export async function getStatusAsync(path: string): Promise<GitStatus> {
  const ts = Date.now();

  // Run both commands in parallel
  const [diff, ab] = await Promise.all([
    gitAsync('status --porcelain', { cwd: path }),
    gitAsync('rev-list --left-right --count @{u}...HEAD', { cwd: path }),
  ]);

  const dirty = diff.length > 0;
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
 * Refresh status for all branches in a project (sync)
 */
export function refreshStatuses(branches: Branch[]): Branch[] {
  return branches.map((b) => ({
    ...b,
    status: getStatus(b.path),
  }));
}

/**
 * Refresh status for all branches in parallel with limited concurrency (async)
 */
export async function refreshStatusesAsync(branches: Branch[]): Promise<Branch[]> {
  const batchSize = 5;
  const results: Branch[] = [];

  for (let i = 0; i < branches.length; i += batchSize) {
    const chunk = branches.slice(i, i + batchSize);
    const chunkResults = await Promise.all(
      chunk.map(async (b) => ({
        ...b,
        status: await getStatusAsync(b.path),
      }))
    );
    results.push(...chunkResults);
  }

  return results;
}

/**
 * List worktrees async
 */
export async function listWorktreesAsync(root: string): Promise<Branch[]> {
  const out = await gitAsync('worktree list --porcelain', { cwd: root });
  if (!out) return [];

  const branches: Branch[] = [];
  let cur: Partial<Branch & { locked?: boolean }> = {};

  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      cur.path = line.slice(9);
    } else if (line.startsWith('branch ')) {
      const ref = line.slice(7);
      cur.name = ref.replace('refs/heads/', '');
    } else if (line.startsWith('locked')) {
      cur.locked = true;
    } else if (line === '') {
      if (cur.path && cur.name) {
        branches.push({
          name: cur.name,
          path: cur.path,
          status: { ahead: 0, behind: 0, dirty: false, ts: 0 },
          locked: cur.locked || false,
          isMain: branches.length === 0,
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
      locked: cur.locked || false,
      isMain: branches.length === 0,
    });
  }

  return branches;
}

/**
 * Get the main branch name for a repository
 */
export async function getMainBranchAsync(repoRoot: string): Promise<string> {
  // Try origin/HEAD first
  try {
    const remoteHead = git('rev-parse --abbrev-ref origin/HEAD', { cwd: repoRoot });
    if (remoteHead && remoteHead !== 'origin/HEAD') {
      return remoteHead.replace('origin/', '');
    }
  } catch {
    // Ignore
  }

  // Fallback to common names
  const candidates = ['main', 'master', 'develop'];
  for (const branch of candidates) {
    try {
      const exists = git(`show-ref --verify refs/heads/${branch}`, { cwd: repoRoot });
      if (exists) return branch;
    } catch {
      // Branch doesn't exist, try next
    }
  }

  // Final fallback: current branch of the main repo
  const current = git('rev-parse --abbrev-ref HEAD', { cwd: repoRoot });
  return current || 'main';
}

/**
 * Get branches that are merged into the specified branch
 */
export async function getMergedBranchesAsync(repoRoot: string, mainBranch: string): Promise<string[]> {
  try {
    const output = git(`branch --merged ${mainBranch}`, { cwd: repoRoot });
    return output
      .split('\n')
      .map(line => {
        // Strip git branch indicators (* for current, + for other worktrees)
        return line.replace(/^[*+ ]+/, '').trim();
      })
      .filter(line => line && line !== mainBranch);
  } catch {
    return [];
  }
}

/**
 * Get the current branch checked out in a worktree
 */
export async function getCurrentBranchAsync(worktreePath: string): Promise<string> {
  try {
    return git('rev-parse --abbrev-ref HEAD', { cwd: worktreePath });
  } catch {
    return '';
  }
}

/**
 * Check if a worktree has uncommitted changes
 */
export async function hasUncommittedChangesAsync(worktreePath: string): Promise<boolean> {
  try {
    const output = git('status --porcelain', { cwd: worktreePath });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Lock a worktree
 */
export async function lockWorktreeAsync(worktreePath: string): Promise<void> {
  await gitAsync(`worktree lock "${worktreePath}"`, { cwd: worktreePath });
}

/**
 * Unlock a worktree
 */
export async function unlockWorktreeAsync(worktreePath: string): Promise<void> {
  await gitAsync(`worktree unlock "${worktreePath}"`, { cwd: worktreePath });
}

/**
 * Remove a worktree
 */
export async function removeWorktreeAsync(repoRoot: string, worktreePath: string): Promise<void> {
  await gitAsync(`worktree remove "${worktreePath}"`, { cwd: repoRoot });
}

/**
 * Get the toplevel path of a repository
 */
export async function getRepoRootAsync(path: string): Promise<string> {
  return await gitAsync('rev-parse --show-toplevel', { cwd: path });
}

/**
 * Check if path is worktree root (async)
 */
async function isWorktreeRootAsync(p: string): Promise<boolean> {
  const gitDir = join(p, '.git');
  const bareHead = join(p, 'HEAD');
  const wt = join(p, 'worktrees');

  try {
    // bare repo with worktrees
    const [headExists, wtExists] = await Promise.all([
      fs.access(bareHead).then(() => true).catch(() => false),
      fs.access(wt).then(() => true).catch(() => false),
    ]);
    if (headExists && wtExists) return true;

    // regular repo
    const gitExists = await fs.access(gitDir).then(() => true).catch(() => false);
    if (gitExists) {
      const stat = await fs.stat(gitDir);
      const gitPath = stat.isDirectory()
        ? gitDir
        : dirname((await fs.readFile(gitDir, 'utf-8')).replace('gitdir: ', '').trim());
      const wtInGit = await fs.access(join(gitPath, 'worktrees')).then(() => true).catch(() => false);
      return wtInGit;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Check if bare repo (async)
 */
async function isBareRepoAsync(p: string): Promise<boolean> {
  const [head, obj] = await Promise.all([
    fs.access(join(p, 'HEAD')).then(() => true).catch(() => false),
    fs.access(join(p, 'objects')).then(() => true).catch(() => false),
  ]);
  return head && obj;
}

/**
 * Scan directory for worktree roots (async, non-blocking)
 */
export async function scanForWorktreesAsync(dir: string, maxDepth = 4): Promise<WorktreeCandidate[]> {
  const results: WorktreeCandidate[] = [];

  async function scan(p: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const stat = await fs.stat(p);
      if (!stat.isDirectory()) return;

      const name = basename(p);
      if (name.startsWith('.') || name === 'node_modules') return;

      // Check if worktree root
      const [isWt, isBare] = await Promise.all([
        isWorktreeRootAsync(p),
        isBareRepoAsync(p),
      ]);

      if (isWt || isBare) {
        const branches = await listWorktreesAsync(p);
        if (branches.length > 0) {
          results.push({
            path: p,
            name: basename(p).replace(/\.git$/, ''),
            branchCount: branches.length,
          });
          return;
        }
      }

      // Recurse into subdirs
      const entries = await fs.readdir(p);
      // Process in batches to avoid too many parallel operations
      const batch = 10;
      for (let i = 0; i < entries.length; i += batch) {
        const chunk = entries.slice(i, i + batch);
        await Promise.all(chunk.map((e) => scan(join(p, e), depth + 1)));
      }
    } catch {
      // Permission denied or other error
    }
  }

  await scan(dir, 0);
  return results;
}
