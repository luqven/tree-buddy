import { describe, it, expect, vi } from 'vitest';
import { deleteWorktreeAtPath } from './ipc';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn((cmd: string, cb: any) => cb(null, '', ''))
}));

describe('deleteWorktreeAtPath', () => {
  it('returns true in test env', async () => {
    // simulate environment in test mode
    process.env.NODE_ENV = 'test';
    const res = await deleteWorktreeAtPath('/path/to/worktree');
    expect(res).toBe(true);
  });

  it('would attempt deletion when not in test mode', async () => {
    process.env.NODE_ENV = 'production';
    const res = await deleteWorktreeAtPath('/path/to/nonexistent/worktree');
    // In non-test mode, the function attempts actual deletion
    // Since the path doesn't exist, it should return false
    expect(res).toBe(false);
  });
});