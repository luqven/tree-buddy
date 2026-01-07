import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleAdd, handleList, handleRemove } from './commands';
import * as git from '../services/git';
import * as fs from 'fs';
import { AppService } from '../services/AppService';

vi.mock('../services/git');
vi.mock('fs');
vi.mock('../services/AppService');

describe('CLI Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAdd', () => {
    it('switches to existing worktree if found by path', async () => {
      const mockWorktrees = [
        { name: 'feat', path: '/path/to/feat', isMain: false, locked: false, status: {} as any }
      ];
      vi.mocked(git.getRepoRootAsync).mockResolvedValue('/path/to/repo');
      vi.mocked(git.listWorktreesAsync).mockResolvedValue(mockWorktrees);
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await handleAdd(['feat']);
      } catch (e: any) {
        expect(e.message).toBe('exit');
      }

      expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/tree-buddy-cd-path', '/path/to/feat');
      mockExit.mockRestore();
    });

    it('switches to existing worktree if found by branch name', async () => {
      const mockWorktrees = [
        { name: 'l/feat', path: '/path/to/worktree-feat', isMain: false, locked: false, status: {} as any }
      ];
      vi.mocked(git.getRepoRootAsync).mockResolvedValue('/path/to/repo');
      vi.mocked(git.listWorktreesAsync).mockResolvedValue(mockWorktrees);
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await handleAdd(['feat']);
      } catch (e: any) {
        expect(e.message).toBe('exit');
      }

      expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/tree-buddy-cd-path', '/path/to/worktree-feat');
      mockExit.mockRestore();
    });

    it('searches all projects if outside a git repo', async () => {
      vi.mocked(git.getRepoRootAsync).mockRejectedValue(new Error('not a repo'));
      
      const mockProjects = [
        { 
          id: '1', name: 'p1', root: '/p1', 
          branches: [{ name: 'global-feat', path: '/p1/feat', isMain: false, locked: false, status: {} as any }] 
        }
      ];
      
      const mockService = {
        getState: vi.fn().mockReturnValue({ cfg: { projects: mockProjects } })
      };
      vi.mocked(AppService).mockImplementation(() => mockService as any);

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await handleAdd(['global-feat']);
      } catch (e: any) {
        expect(e.message).toBe('exit');
      }

      expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/tree-buddy-cd-path', '/p1/feat');
      mockExit.mockRestore();
    });
  });

  describe('handleRemove', () => {
    it('removes worktree by branch name', async () => {
      const mockWorktrees = [
        { name: 'feat', path: '/path/to/feat', isMain: false, locked: false, status: {} as any }
      ];
      vi.mocked(git.getRepoRootAsync).mockResolvedValue('/path/to/repo');
      vi.mocked(git.listWorktreesAsync).mockResolvedValue(mockWorktrees);
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await handleRemove(['feat']);
      } catch (e: any) {
        expect(e.message).toBe('exit');
      }

      expect(git.removeWorktreeAsync).toHaveBeenCalledWith('/path/to/repo', '/path/to/feat', false);
      mockExit.mockRestore();
    });

    it('uses force flag if provided', async () => {
      const mockWorktrees = [
        { name: 'feat', path: '/path/to/feat', isMain: false, locked: false, status: {} as any }
      ];
      vi.mocked(git.getRepoRootAsync).mockResolvedValue('/path/to/repo');
      vi.mocked(git.listWorktreesAsync).mockResolvedValue(mockWorktrees);
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await handleRemove(['-f', 'feat']);
      } catch (e: any) {
        expect(e.message).toBe('exit');
      }

      expect(git.removeWorktreeAsync).toHaveBeenCalledWith('/path/to/repo', '/path/to/feat', true);
      mockExit.mockRestore();
    });
  });

  describe('handleList', () => {
    it('lists projects and branches', async () => {
      const mockProjects = [
        { 
          id: '1', name: 'p1', root: '/p1', 
          branches: [
            { name: 'main', path: '/p1', isMain: true, locked: false, status: {} as any },
            { name: 'feat', path: '/p1/feat', isMain: false, locked: true, status: {} as any }
          ] 
        }
      ];
      
      const mockService = {
        getState: vi.fn().mockReturnValue({ cfg: { projects: mockProjects } }),
        refreshProject: vi.fn().mockResolvedValue(undefined)
      };
      vi.mocked(AppService).mockImplementation(() => mockService as any);

      const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      await handleList([]);

      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('> p1'));
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('main'));
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('feat'));
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('[locked]'));

      mockLog.mockRestore();
    });
  });
});
