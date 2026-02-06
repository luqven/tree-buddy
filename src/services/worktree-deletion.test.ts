import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  removeWorktreeAsync,
  listWorktreesAsync,
  createWorktreeAsync,
  pruneWorktreesAsync,
} from './git';

describe('worktree deletion integration', () => {
  let tmp: string;
  let mainRepo: string;
  let featureWt: string;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'tree-buddy-deletion-test-'));
    mainRepo = join(tmp, 'main-repo');

    execSync(`git init "${mainRepo}"`, { cwd: tmp });
    writeFileSync(join(mainRepo, 'readme.txt'), 'initial commit');
    execSync('git add . && git commit -m "init"', { cwd: mainRepo });

    featureWt = join(tmp, 'feature-worktree');
    execSync(`git worktree add "${featureWt}" -b feature`, { cwd: mainRepo });
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('deletes a worktree successfully', async () => {
    const testWt = join(tmp, 'to-delete');
    execSync(`git worktree add "${testWt}" -b to-delete`, { cwd: mainRepo });

    let wts = await listWorktreesAsync(mainRepo);
    expect(wts.some(w => w.path.includes('to-delete'))).toBe(true);

    await removeWorktreeAsync(mainRepo, testWt);
    await pruneWorktreesAsync(mainRepo);

    wts = await listWorktreesAsync(mainRepo);
    expect(wts.some(w => w.path.includes('to-delete'))).toBe(false);
  });

  it('deletes a worktree with uncommitted changes (force)', async () => {
    const testWt = join(tmp, 'dirty-worktree');
    execSync(`git worktree add "${testWt}" -b dirty`, { cwd: mainRepo });

    writeFileSync(join(testWt, 'dirty.txt'), 'uncommitted changes');

    let wts = await listWorktreesAsync(mainRepo);
    expect(wts.some(w => w.path.includes('dirty-worktree'))).toBe(true);

    await removeWorktreeAsync(mainRepo, testWt, true);
    await pruneWorktreesAsync(mainRepo);

    wts = await listWorktreesAsync(mainRepo);
    expect(wts.some(w => w.path.includes('dirty-worktree'))).toBe(false);
  });

  it('fails to delete main worktree without force', async () => {
    await expect(removeWorktreeAsync(mainRepo, mainRepo, false)).rejects.toThrow();
  });

  it('deletes via trash (simulated)', async () => {
    const testWt = join(tmp, 'trash-test');
    execSync(`git worktree add "${testWt}" -b trash-test`, { cwd: mainRepo });

    let wts = await listWorktreesAsync(mainRepo);
    expect(wts.some(w => w.path.includes('trash-test'))).toBe(true);

    await removeWorktreeAsync(mainRepo, testWt);
    await pruneWorktreesAsync(mainRepo);

    wts = await listWorktreesAsync(mainRepo);
    expect(wts.some(w => w.path.includes('trash-test'))).toBe(false);
    expect(existsSync(testWt)).toBe(false);
  });

  it('handles concurrent deletion of multiple worktrees', async () => {
    const paths: string[] = [];
    for (let i = 0; i < 3; i++) {
      const p = join(tmp, `concurrent-${i}`);
      execSync(`git worktree add "${p}" -b concurrent-${i}`, { cwd: mainRepo });
      paths.push(p);
    }

    let wts = await listWorktreesAsync(mainRepo);
    expect(wts.filter(w => w.path.includes('concurrent-')).length).toBe(3);

    await Promise.all(paths.map(p => removeWorktreeAsync(mainRepo, p)));
    await pruneWorktreesAsync(mainRepo);

    wts = await listWorktreesAsync(mainRepo);
    expect(wts.filter(w => w.path.includes('concurrent-')).length).toBe(0);
  });
});
