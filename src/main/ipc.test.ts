import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import { initIpc } from './ipc';

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
  app: {
    quit: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock('../services/store', () => ({
  load: vi.fn(() => ({ projects: [] })),
  save: vi.fn(),
  addProject: vi.fn(),
  rmProject: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock('../services/cache', () => ({
  loadScanCache: vi.fn(),
  saveScanCache: vi.fn(),
  isCacheStale: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    initIpc();
  });

  describe('IPC registration', () => {
    it('registers delete-worktrees handler', () => {
      const registered = (ipcMain.handle as any).mock.calls.some((call: any) => call[0] === 'delete-worktrees');
      expect(registered).toBe(true);
    });

    it('registers delete-worktree handler', () => {
      const registered = (ipcMain.handle as any).mock.calls.some((call: any) => call[0] === 'delete-worktree');
      expect(registered).toBe(true);
    });
  });
});
