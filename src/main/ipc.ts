import { ipcMain, shell, dialog, BrowserWindow, app } from 'electron';
import { homedir } from 'os';
import { join } from 'path';
import { Config, Project, PlatformAdapter } from '../core/types';
import { AppService } from '../services/AppService';
import { log } from './logger';

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
  service = new AppService(electronAdapter, () => {
    notifyRenderer();
  });

  ipcMain.handle('get-state', () => service.getState());
  ipcMain.handle('refresh-all', async () => { await service.refreshAll(); });
  ipcMain.handle('refresh-project', async (_e, id: string) => { await service.refreshProject(id); });
  ipcMain.handle('add-project', async () => { return await service.getCandidates(); });
  ipcMain.handle('remove-project', (_e, id: string) => { service.removeProject(id); });
  ipcMain.handle('open-path', (_e, path: string) => { service.openPath(path); });
  ipcMain.handle('show-in-folder', (_e, path: string) => { service.showInFolder(path); });
  ipcMain.handle('open-in-terminal', (_e, path: string) => { service.openInTerminal(path); });
  ipcMain.handle('update-config', (_e, updates: Partial<Config>) => { service.updateConfig(updates); });
  ipcMain.handle('get-candidates', async () => { return await service.getCandidates(); });
  ipcMain.handle('pick-directory', async () => {
    const { filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'], message: 'Select worktree project directory' });
    return filePaths[0] ?? null;
  });
  ipcMain.handle('confirm-add-project', async (_e, path: string, name: string) => {
    return await service.confirmAddProject(path, name);
  });
  ipcMain.handle('quit', () => { service.quit(); });
  ipcMain.handle('delete-worktree', async (_e, root: string, worktreePath: string, force = false, useTrash = false) => {
    return await service.deleteWorktrees([{ root, path: worktreePath, force, useTrash }]);
  });
  ipcMain.handle('delete-worktrees', async (_e, items: any[]) => {
    return await service.deleteWorktrees(items, (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deletion-progress', data);
      }
    });
  });
  ipcMain.handle('lock-worktree', async (_e, path: string) => { await service.lockWorktree(path); });
  ipcMain.handle('unlock-worktree', async (_e, path: string) => { await service.unlockWorktree(path); });
  ipcMain.handle('window-shown', async () => { await service.refreshAllThrottled(); });
}
