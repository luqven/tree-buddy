import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, realpathSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  isBareRepo,
  isWorktreeRoot,
  listWorktrees,
  listWorktreesAsync,
  getStatus,
  getStatusAsync,
  scanForWorktrees,
  scanForWorktreesAsync,
  refreshStatusesAsync,
  getMainBranchAsync,
  getMergedBranchesAsync,
  removeWorktreeAsync,
  pruneWorktreesAsync,
  createWorktreeAsync,
  fetchRemoteBranchesAsync,
  fetchLocalBranchesAsync,
  fetchAsync,
  pullAsync,
} from './git';

describe('git service', () => {
  let tmp: string;
  let bareRepo: string;
  let wt1: string;
  let wt2: string;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'tree-buddy-test-'));
    bareRepo = join(tmp, 'myrepo.git');
    wt1 = join(tmp, 'wt-main');
    wt2 = join(tmp, 'wt-feature');

    // Create bare repo
    execSync(`git init --bare "${bareRepo}"`);

    // Create initial worktree with a commit
    execSync(`git clone "${bareRepo}" "${wt1}"`);
    writeFileSync(join(wt1, 'readme.txt'), 'hello');
    execSync('git add . && git commit -m "init"', { cwd: wt1 });
    execSync('git push origin main', { cwd: wt1 });

    // Add a second worktree
    execSync(`git worktree add "${wt2}" -b feature`, { cwd: wt1 });
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('isBareRepo', () => {
    it('returns true for bare repo', () => {
      expect(isBareRepo(bareRepo)).toBe(true);
    });

    it('returns false for regular repo', () => {
      expect(isBareRepo(wt1)).toBe(false);
    });

    it('returns false for non-repo', () => {
      expect(isBareRepo(tmp)).toBe(false);
    });
  });

  describe('isWorktreeRoot', () => {
    it('returns true for repo with worktrees', () => {
      expect(isWorktreeRoot(wt1)).toBe(true);
    });

    it('returns false for bare repo without worktrees dir check', () => {
      // bare repo itself isn't a worktree root in our definition
      expect(isWorktreeRoot(bareRepo)).toBe(false);
    });
  });

  describe('listWorktrees', () => {
    it('lists all worktrees from main repo', () => {
      const wts = listWorktrees(wt1);
      expect(wts.length).toBe(2);
      const names = wts.map((w) => w.name).sort();
      expect(names).toContain('main');
      expect(names).toContain('feature');
    });

    it('lists worktrees from feature branch too', () => {
      const wts = listWorktrees(wt2);
      expect(wts.length).toBe(2);
    });
  });

  describe('getStatus', () => {
    it('returns clean status for unchanged repo', () => {
      const s = getStatus(wt1);
      expect(s.dirty).toBe(false);
      expect(s.ts).toBeGreaterThan(0);
    });

    it('returns dirty when file modified', () => {
      writeFileSync(join(wt2, 'new.txt'), 'new content');
      const s = getStatus(wt2);
      expect(s.dirty).toBe(true);
      // cleanup
      execSync('git checkout .', { cwd: wt2 });
      rmSync(join(wt2, 'new.txt'), { force: true });
    });
  });

  describe('scanForWorktrees', () => {
    it('finds worktree projects in directory', () => {
      const found = scanForWorktrees(tmp, 2);
      expect(found.length).toBeGreaterThanOrEqual(1);
      const paths = found.map((f) => f.path);
      expect(paths).toContain(wt1);
    });

    it('respects max depth', () => {
      const found = scanForWorktrees(tmp, 0);
      expect(found.length).toBe(0);
    });
  });

  // Async versions
  describe('listWorktreesAsync', () => {
    it('lists all worktrees from main repo', async () => {
      const wts = await listWorktreesAsync(wt1);
      expect(wts.length).toBe(2);
      const names = wts.map((w) => w.name).sort();
      expect(names).toContain('main');
      expect(names).toContain('feature');
    });

    it('sets isMain correctly', async () => {
      const wts = await listWorktreesAsync(wt1);
      const main = wts.find(w => w.name === 'main');
      const feature = wts.find(w => w.name === 'feature');
      expect(main?.isMain).toBe(true);
      expect(feature?.isMain).toBe(false);
    });

    it('detects locked worktrees', async () => {
      execSync(`git worktree lock "${wt2}" --reason "test"`, { cwd: wt1 });
      const wts = await listWorktreesAsync(wt1);
      const feature = wts.find(w => w.name === 'feature');
      expect(feature?.locked).toBe(true);
      execSync(`git worktree unlock "${wt2}"`, { cwd: wt1 });
    });
  });

  describe('getStatusAsync', () => {
    it('returns clean status for unchanged repo', async () => {
      const s = await getStatusAsync(wt1);
      expect(s.dirty).toBe(false);
      expect(s.ts).toBeGreaterThan(0);
    });

    it('returns dirty when file modified', async () => {
      writeFileSync(join(wt2, 'new2.txt'), 'new content');
      const s = await getStatusAsync(wt2);
      expect(s.dirty).toBe(true);
      // cleanup
      execSync('git checkout .', { cwd: wt2 });
      rmSync(join(wt2, 'new2.txt'), { force: true });
    });
  });

  describe('refreshStatusesAsync', () => {
    it('refreshes all branch statuses in parallel', async () => {
      const branches = await listWorktreesAsync(wt1);
      const refreshed = await refreshStatusesAsync(branches);
      expect(refreshed.length).toBe(2);
      for (const b of refreshed) {
        expect(b.status.ts).toBeGreaterThan(0);
      }
    });
  });

  describe('scanForWorktreesAsync', () => {
    it('finds worktree projects in directory', async () => {
      const found = await scanForWorktreesAsync(tmp, 2);
      expect(found.length).toBeGreaterThanOrEqual(1);
      const paths = found.map((f) => f.path);
      expect(paths).toContain(wt1);
    });

    it('respects max depth', async () => {
      const found = await scanForWorktreesAsync(tmp, 0);
      expect(found.length).toBe(0);
    });
  });

  describe('getMainBranchAsync', () => {
    it('finds main branch (main)', async () => {
      const main = await getMainBranchAsync(wt1);
      expect(main).toBe('main');
    });
  });

  describe('lock/unlock', () => {
    it('locks and unlocks a worktree', async () => {
      const { lockWorktreeAsync, unlockWorktreeAsync, listWorktreesAsync } = await import('./git');
      await lockWorktreeAsync(wt2);
      let wts = await listWorktreesAsync(wt1);
      expect(wts.find(w => w.name === 'feature')?.locked).toBe(true);

      await unlockWorktreeAsync(wt2);
      wts = await listWorktreesAsync(wt1);
      expect(wts.find(w => w.name === 'feature')?.locked).toBe(false);
    });
  });

  describe('removeWorktreeAsync', () => {
    it('removes a worktree', async () => {
      const wt3 = join(tmp, 'wt-to-remove-3');
      execSync(`git worktree add "${wt3}" -b to-remove-3`, { cwd: wt1 });
      
      let wts = await listWorktreesAsync(wt1);
      // Check if it exists by looking for the directory name in the paths
      expect(wts.some(w => w.path.includes('wt-to-remove-3'))).toBe(true);

      await removeWorktreeAsync(wt1, wt3);

      wts = await listWorktreesAsync(wt1);
      expect(wts.some(w => w.path.includes('wt-to-remove-3'))).toBe(false);
    });

    it('handles high throughput deletion', async () => {
      const count = 10;
      const paths: string[] = [];
      for (let i = 0; i < count; i++) {
        const p = join(tmp, `wt-stress-${i}`);
        execSync(`git worktree add "${p}" -b stress-${i}`, { cwd: wt1 });
        paths.push(p);
      }

      let wts = await listWorktreesAsync(wt1);
      expect(wts.length).toBeGreaterThanOrEqual(count);

      // Delete all in parallel (simulating stress)
      await Promise.all(paths.map(p => removeWorktreeAsync(wt1, p)));

      wts = await listWorktreesAsync(wt1);
      for (const p of paths) {
        expect(wts.some(w => w.path === p)).toBe(false);
      }
    });

    it('handles corrupted worktrees (metadata exists but folder is gone)', async () => {
      const wtCorrupt = join(tmp, 'wt-corrupt');
      execSync(`git worktree add "${wtCorrupt}" -b corrupt`, { cwd: wt1 });
      
      // Manually delete the directory but keep git metadata
      rmSync(wtCorrupt, { recursive: true, force: true });

      // listWorktrees should still see it
      let wts = await listWorktreesAsync(wt1);
      const paths = wts.map(w => w.path);
      // We use includes because git might have normalized the path (e.g. /private/var on macOS)
      expect(paths.some(p => p.includes('wt-corrupt'))).toBe(true);

      // pruneWorktrees should clean it up
      await pruneWorktreesAsync(wt1);

      wts = await listWorktreesAsync(wt1);
      expect(wts.some(p => p.path.includes('wt-corrupt'))).toBe(false);
    });
  });

  describe('getMergedBranchesAsync', () => {
    it('identifies merged branches including those in worktrees', async () => {
      // 1. Create and merge a branch
      execSync('git checkout -b merged-branch', { cwd: wt1 });
      writeFileSync(join(wt1, 'merged.txt'), 'merged');
      execSync('git add . && git commit -m "merge me"', { cwd: wt1 });
      execSync('git checkout main', { cwd: wt1 });
      execSync('git merge merged-branch', { cwd: wt1 });

      // 2. Add it as a worktree (this will make it appear with '+' in git branch --merged)
      const wtMerged = join(tmp, 'wt-merged');
      execSync(`git worktree add "${wtMerged}" merged-branch`, { cwd: wt1 });

      // 3. Check merged branches
      const merged = await getMergedBranchesAsync(wt1, 'main');
      
      // Should include merged-branch (even if it has + prefix in git output)
      expect(merged).toContain('merged-branch');
      // Should not include main itself
      expect(merged).not.toContain('main');

      // Cleanup
      execSync(`git worktree remove "${wtMerged}"`, { cwd: wt1 });
      execSync('git branch -d merged-branch', { cwd: wt1 });
    });
  });

  describe('createWorktreeAsync', () => {
    it('creates a new worktree with a new branch', async () => {
      const wtNew = join(tmp, 'wt-new-branch');
      await createWorktreeAsync({
        repoRoot: wt1,
        path: wtNew,
        branch: 'new-branch',
        createBranch: true,
      });

      const wts = await listWorktreesAsync(wt1);
      expect(wts.some(w => w.name === 'new-branch')).toBe(true);

      // Cleanup
      await removeWorktreeAsync(wt1, wtNew);
      execSync('git branch -d new-branch', { cwd: wt1 });
    });

    it('creates worktree from existing branch', async () => {
      // Create a branch first
      execSync('git branch existing-branch', { cwd: wt1 });
      
      const wtExisting = join(tmp, 'wt-existing');
      await createWorktreeAsync({
        repoRoot: wt1,
        path: wtExisting,
        branch: 'existing-branch',
        createBranch: false,
      });

      const wts = await listWorktreesAsync(wt1);
      expect(wts.some(w => w.name === 'existing-branch')).toBe(true);

      // Cleanup
      await removeWorktreeAsync(wt1, wtExisting);
      execSync('git branch -d existing-branch', { cwd: wt1 });
    });

    it('creates new branch from specified base branch', async () => {
      const wtBased = join(tmp, 'wt-based');
      await createWorktreeAsync({
        repoRoot: wt1,
        path: wtBased,
        branch: 'based-branch',
        createBranch: true,
        baseBranch: 'main',
      });

      const wts = await listWorktreesAsync(wt1);
      expect(wts.some(w => w.name === 'based-branch')).toBe(true);

      // Cleanup
      await removeWorktreeAsync(wt1, wtBased);
      execSync('git branch -d based-branch', { cwd: wt1 });
    });
  });

  describe('fetchRemoteBranchesAsync', () => {
    it('lists remote branches', async () => {
      const branches = await fetchRemoteBranchesAsync(wt1);
      expect(branches).toContain('main');
    });

    it('returns empty array for invalid repo', async () => {
      const branches = await fetchRemoteBranchesAsync('/invalid/path');
      expect(branches).toEqual([]);
    });
  });

  describe('fetchLocalBranchesAsync', () => {
    it('lists local branches', async () => {
      const branches = await fetchLocalBranchesAsync(wt1);
      expect(branches).toContain('main');
      expect(branches).toContain('feature');
    });

    it('returns empty array for invalid repo', async () => {
      const branches = await fetchLocalBranchesAsync('/invalid/path');
      expect(branches).toEqual([]);
    });
  });

  describe('fetchAsync', () => {
    it('fetches without error on valid repo', async () => {
      await expect(fetchAsync(wt1)).resolves.not.toThrow();
    });
  });

  describe('pullAsync', () => {
    it('pulls without error on valid repo', async () => {
      // Should succeed since wt1 is tracking origin/main
      const result = await pullAsync(wt1);
      expect(typeof result).toBe('string');
    });
  });

  describe('failure tolerance (offline support)', () => {
    it('getStatus returns safe defaults when path is not a repo', () => {
      const s = getStatus(tmp);
      expect(s).toEqual({
        ahead: 0,
        behind: 0,
        dirty: false,
        ts: expect.any(Number),
      });
    });

    it('listWorktrees returns empty array when git fails', () => {
      const wts = listWorktrees('/non/existent/path');
      expect(wts).toEqual([]);
    });

    it('getMainBranchAsync returns fallback "main" when git fails', async () => {
      const main = await getMainBranchAsync('/non/existent/path');
      expect(main).toBe('main');
    });

    it('refreshStatusesAsync handles partial failures', async () => {
      const branches = [
        { name: 'main', path: wt1, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        { name: 'bad', path: '/invalid/path', status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
      ];
      const refreshed = await refreshStatusesAsync(branches);
      expect(refreshed[0].status.ts).toBeGreaterThan(0);
      expect(refreshed[1].status.ts).toBeGreaterThan(0); // Should still have a TS from the default object
      expect(refreshed[1].status.dirty).toBe(false);
    });
  });
});
