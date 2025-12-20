import { describe, it, expect, vi } from 'vitest';
import { deleteWorktreePathForTest } from './ipc';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn((cmd: string, cb: any) => cb(null, '', ''))
}));

describe('deleteWorktreePathForTest', () => {
  const child = require('child_process');

  it('returns true in test env', async () => {
    const res = await deleteWorktreePathForTest('/path/to/worktree');
    expect(res).toBe(true);
  });

  it('returns false on error', async () => {
    (child.execSync as any).mockImplementation(() => { throw new Error('err'); });
    const res = await deleteWorktreePathForTest('/path/to/worktree');
    expect(res).toBe(false);
  });
});