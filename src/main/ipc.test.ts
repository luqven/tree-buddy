import { describe, it, expect, vi } from 'vitest';
import { deleteWorktreePathForTest } from './ipc';

vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('deleteWorktreePathForTest', () => {
  const { execSync } = require('child_process');

  it('returns true on success', async () => {
    (execSync as any).mockImplementation(() => '/path/to/root');
    const res = await deleteWorktreePathForTest('/path/to/worktree');
    expect(res).toBe(true);
  });

  it('returns false on error', async () => {
    (execSync as any).mockImplementation(() => { throw new Error('err'); });
    const res = await deleteWorktreePathForTest('/path/to/worktree');
    expect(res).toBe(false);
  });
});
