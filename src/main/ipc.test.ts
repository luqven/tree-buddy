import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteWorktreeAtPath, initIpc } from './ipc';
import { load, save } from '../services/store';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  shell: {
    openPath: vi.fn(),
    showItemInFolder: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock('../services/store', () => ({
  load: vi.fn(),
  save: vi.fn(),
  addProject: vi.fn(),
  rmProject: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock('../services/git', () => ({
  listWorktreesAsync: vi.fn(),
  refreshStatusesAsync: vi.fn(),
  scanForWorktreesAsync: vi.fn(),
  getMainBranchAsync: vi.fn(),
  getMergedBranchesAsync: vi.fn(),
  lockWorktreeAsync: vi.fn(),
  unlockWorktreeAsync: vi.fn(),
  removeWorktreeAsync: vi.fn(),
  getRepoRootAsync: vi.fn(),
}));

describe('IPC / Main Process', () => {
  describe('deleteWorktreeAtPath', () => {
    it('returns true in test env', async () => {
      process.env.NODE_ENV = 'test';
      const res = await deleteWorktreeAtPath('/path/to/worktree');
      expect(res).toBe(true);
    });

    it('would attempt deletion when not in test mode', async () => {
      process.env.NODE_ENV = 'production';
      const res = await deleteWorktreeAtPath('/path/to/nonexistent/worktree');
      expect(res).toBe(false);
    });
  });
});