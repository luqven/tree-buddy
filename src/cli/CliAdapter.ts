import { PlatformAdapter } from '../core/types';
import { homedir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';

export function createCliAdapter(onQuit: () => void): PlatformAdapter {
  return {
    openPath: async (path) => {
      exec(`open "${path}"`);
    },
    showItemInFolder: async (path) => {
      exec(`open -R "${path}"`);
    },
    trashItem: async (path) => {
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
    quit: onQuit,
  };
}
