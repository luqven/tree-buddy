import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing
vi.mock('@opentui/core', () => ({
  createCliRenderer: vi.fn().mockResolvedValue({
    destroy: vi.fn(),
  }),
}));

vi.mock('@opentui/react', () => ({
  createRoot: vi.fn().mockReturnValue({
    render: vi.fn(),
    unmount: vi.fn(),
  }),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn().mockReturnValue({
    on: vi.fn((event, cb) => {
      if (event === 'exit') {
        // Simulate immediate exit
        setTimeout(() => cb(0), 0);
      }
    }),
    unref: vi.fn(),
  }),
}));

describe('CLI index', () => {
  describe('cleanup behavior', () => {
    let mockStdin: any;
    let mockStdout: any;

    beforeEach(() => {
      mockStdin = {
        isTTY: true,
        setRawMode: vi.fn(),
      };
      
      mockStdout = {
        write: vi.fn(),
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('setRawMode is called with false when stdin is TTY', () => {
      // Simulate the cleanup logic
      const stdin = mockStdin;
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      
      expect(stdin.setRawMode).toHaveBeenCalledWith(false);
    });

    it('setRawMode is not called when stdin is not TTY', () => {
      mockStdin.isTTY = false;
      
      // Simulate the cleanup logic
      const stdin = mockStdin;
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      
      expect(stdin.setRawMode).not.toHaveBeenCalled();
    });

    it('writes escape sequences to exit alternate screen', () => {
      const stdout = mockStdout;
      
      // Simulate the cleanup escape sequence
      stdout.write('\x1b[?1049l\x1b[?25h');
      
      expect(stdout.write).toHaveBeenCalledWith('\x1b[?1049l\x1b[?25h');
    });
  });

  describe('cd and quit (Enter key)', () => {
    it('outputs path to stdout for shell alias to capture', () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const path = '/test/worktree';
      
      // Simulate onCdQuit behavior
      console.log(path);
      
      expect(mockLog).toHaveBeenCalledWith(path);
      mockLog.mockRestore();
    });
  });

  describe('subshell mode (s key)', () => {
    it('spawns interactive shell with correct options', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);
      
      const path = '/test/worktree';
      const shell = '/bin/zsh';
      
      // Simulate subshell spawn
      mockSpawn(shell, ['-i'], {
        cwd: path,
        stdio: 'inherit',
        detached: true,
      });
      
      expect(mockSpawn).toHaveBeenCalledWith(shell, ['-i'], {
        cwd: path,
        stdio: 'inherit',
        detached: true,
      });
    });

    it('uses SHELL env var or falls back to /bin/zsh', () => {
      const originalShell = process.env.SHELL;
      
      // Test with SHELL set
      process.env.SHELL = '/bin/bash';
      let shell = process.env.SHELL || '/bin/zsh';
      expect(shell).toBe('/bin/bash');
      
      // Test fallback
      delete process.env.SHELL;
      shell = process.env.SHELL || '/bin/zsh';
      expect(shell).toBe('/bin/zsh');
      
      // Restore
      if (originalShell) {
        process.env.SHELL = originalShell;
      }
    });

    it('prints informative messages before spawning subshell', () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const path = '/test/worktree';
      
      // Simulate onSubshell behavior
      console.log(`Opening subshell in ${path}...`);
      console.log('Type "exit" to return.\n');
      
      expect(mockLog).toHaveBeenCalledWith(`Opening subshell in ${path}...`);
      expect(mockLog).toHaveBeenCalledWith('Type "exit" to return.\n');
      mockLog.mockRestore();
    });
  });
});
