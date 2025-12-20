import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  isBareRepo,
  isWorktreeRoot,
  listWorktrees,
  getStatus,
  scanForWorktrees,
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
});
