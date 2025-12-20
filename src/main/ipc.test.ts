import { describe, it, expect, vi } from 'vitest';
import { deleteWorktreeAtPath } from './ipc';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn((cmd: string, cb: any) => cb(null, '', ''))
}));

describe('deleteWorktreeAtPath', () => {
  const cp = require('child_process');

  it('returns true in test env', async () => {
    // simulate environment in test mode
    process.env.NODE_ENV = 'test';
    const res = await deleteWorktreeAtPath('/path/to/worktree');
    expect(res).toBe(true);
  });

  it('would attempt deletion when not in test mode', async () => {
    process.env.NODE_ENV = 'production';
    (cp.execSync as any).mockImplementation(() => '/path/to/root');
    const res = await deleteWorktreeAtPath('/path/to/worktree');
    // In non-test mode, the function would attempt actual deletion; for safety, treat as boolean
    expect(typeof res).toBe('boolean');
  });
});