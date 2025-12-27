import { ipcMain, shell, dialog, BrowserWindow, app } from 'electron';
import { homedir } from 'os';
import { join } from 'path';
import { Config, Project, PlatformAdapter } from '../core/types.js';
import { AppService } from '../services/AppService.js';
import { log, logError } from './logger.js';

let service: AppService;
let mainWindow: BrowserWindow | null = null;

const electronAdapter: PlatformAdapter = {
  openPath: async (path) => { await shell.openPath(path); },
  showItemInFolder: async (path) => { shell.showItemInFolder(path); },
  trashItem: async (path) => { await shell.trashItem(path); },
  openTerminal: async (path) => {
    const { spawn } = await import('child_process');
    spawn('open', ['-a', 'Ghostty', path], { detached: true, stdio: 'ignore' });
  },
  getDocumentsPath: () => join(homedir(), 'Documents'),
  quit: () => { app.quit(); },
};

export function setMainWindow(win: BrowserWindow | null) {
  mainWindow = win;
}

function notifyRenderer() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const state = service.getState();
    mainWindow.webContents.send('state-update', state);
  }
}

export function initIpc(): void {
  log('[ipc] initializing');
  try {
    service = new AppService(electronAdapter);
    service.subscribe((state) => {
      log('[ipc] state update received from service', { projects: state.cfg.projects.length });
      notifyRenderer();
    });

    ipcMain.handle('get-state', () => {
      log('[ipc] get-state');
      return service.getState();
    });
    ipcMain.handle('refresh-all', async () => {
      log('[ipc] refresh-all');
      await service.refreshAll();
    });
    ipcMain.handle('refresh-project', async (_e, id: string) => {
      log('[ipc] refresh-project', id);
      await service.refreshProject(id);
    });
    ipcMain.handle('add-project', async () => {
      log('[ipc] add-project');
      return await service.getCandidates();
    });
    ipcMain.handle('remove-project', (_e, id: string) => {
      log('[ipc] remove-project', id);
      service.removeProject(id);
    });
    ipcMain.handle('open-path', (_e, path: string) => {
      log('[ipc] open-path', path);
      service.openPath(path);
    });
    ipcMain.handle('show-in-folder', (_e, path: string) => {
      log('[ipc] show-in-folder', path);
      service.showInFolder(path);
    });
    ipcMain.handle('open-in-terminal', (_e, path: string) => {
      log('[ipc] open-in-terminal', path);
      service.openInTerminal(path);
    });
    ipcMain.handle('update-config', (_e, updates: Partial<Config>) => {
      log('[ipc] update-config', updates);
      service.updateConfig(updates);
    });
    ipcMain.handle('get-candidates', async () => {
      log('[ipc] get-candidates');
      try {
        const candidates = await service.getCandidates();
        log('[ipc] found candidates:', candidates.length);
        return candidates;
      } catch (err) {
        logError('[ipc] get-candidates failed', err);
        return [];
      }
    });
    ipcMain.handle('pick-directory', async () => {
      log('[ipc] pick-directory');
      const { filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'], message: 'Select worktree project directory' });
      return filePaths[0] ?? null;
    });
    ipcMain.handle('confirm-add-project', async (_e, path: string, name: string) => {
      log('[ipc] confirm-add-project', { path, name });
      return await service.confirmAddProject(path, name);
    });
    ipcMain.handle('quit', () => {
      log('[ipc] quit');
      service.quit();
    });
    ipcMain.handle('delete-worktree', async (_e, root: string, worktreePath: string, force = false, useTrash = false) => {
      log('[ipc] delete-worktree', { root, worktreePath, force, useTrash });
      return await service.deleteWorktrees([{ root, path: worktreePath, force, useTrash }]);
    });
    ipcMain.handle('delete-worktrees', async (_e, items: any[]) => {
      log('[ipc] delete-worktrees', items.length);
      return await service.deleteWorktrees(items, (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('deletion-progress', data);
        }
      });
    });
    ipcMain.handle('lock-worktree', async (_e, path: string) => {
      log('[ipc] lock-worktree', path);
      await service.lockWorktree(path);
    });
    ipcMain.handle('unlock-worktree', async (_e, path: string) => {
      log('[ipc] unlock-worktree', path);
      await service.unlockWorktree(path);
    });
    ipcMain.handle('window-shown', async () => {
      log('[ipc] window-shown');
      await service.refreshAllThrottled();
    });
  } catch (err) {
    logError('[ipc] initialization failed', err);
  }
}
