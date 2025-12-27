import { PlatformAdapter } from '../core/types';
import { homedir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';

export const cliAdapter: PlatformAdapter = {
  openPath: async (path) => {
    exec(`open "${path}"`);
  },
  showItemInFolder: async (path) => {
    exec(`open -R "${path}"`);
  },
  trashItem: async (path) => {
    // Basic rm for now, or use a 'trash' package if needed
    // For safety in CLI, maybe we just don't implement trash or use rm -rf
    // Let's use rm -rf for now as a simple implementation
    return new Promise((resolve, reject) => {
      exec(`rm -rf "${path}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  openTerminal: async (path) => {
    exec(`open -a Ghostty "${path}"`);
  },
  getDocumentsPath: () => join(homedir(), 'Documents'),
  quit: () => {
    process.exit(0);
  },
};
