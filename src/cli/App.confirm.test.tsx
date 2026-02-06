/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { App } from './App';
import { AppState } from '../services/AppService';

let keyboardCallback: ((event: any) => void) | null = null;

vi.mock('@opentui/react', () => ({
  useKeyboard: vi.fn((cb: (event: any) => void) => {
    keyboardCallback = cb;
  }),
  useTerminalDimensions: vi.fn().mockReturnValue({ width: 80, height: 24 }),
}));

describe('App confirmation flow', () => {
  const createMockService = (state: AppState) => {
    const deleteWorktreeFn = vi.fn().mockResolvedValue(true);
    const deleteWorktreesFn = vi.fn().mockResolvedValue(true);
    const removeProjectFn = vi.fn();
    const refreshAllThrottledFn = vi.fn();
    const setThemeFn = vi.fn();
    const setTerminalModeFn = vi.fn();
    const getPersistedThemeFn = vi.fn().mockReturnValue(undefined);
    const getPersistedTerminalModeFn = vi.fn().mockReturnValue(undefined);
    const quitFn = vi.fn();
    const openPathFn = vi.fn();
    const openInTerminalFn = vi.fn();

    return {
      getState: () => state,
      subscribe: vi.fn().mockReturnValue(() => {}),
      refreshAllThrottled: refreshAllThrottledFn,
      refreshAll: vi.fn().mockResolvedValue(undefined),
      deleteWorktree: deleteWorktreeFn,
      deleteWorktrees: deleteWorktreesFn,
      removeProject: removeProjectFn,
      setTheme: setThemeFn,
      setTerminalMode: setTerminalModeFn,
      getPersistedTheme: getPersistedThemeFn,
      getPersistedTerminalMode: getPersistedTerminalModeFn,
      quit: quitFn,
      openPath: openPathFn,
      openInTerminal: openInTerminalFn,
      _spies: { deleteWorktreeFn, deleteWorktreesFn, removeProjectFn },
    };
  };

  beforeEach(() => {
    keyboardCallback = null;
  });

  describe('worktree deletion confirmation (d key)', () => {
    it('triggers confirmation dialog when d is pressed on deletable branch', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [
          { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
          { name: 'feature', path: '/tmp/test-repo/.worktree/feature', isMain: false, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        ],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      // Navigate to feature branch (index 2, after project at 0 and main at 1)
      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);
      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'd' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.deleteWorktreeFn).not.toHaveBeenCalled();
    });

    it('confirms deletion when y is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [
          { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
          { name: 'feature', path: '/tmp/test-repo/.worktree/feature', isMain: false, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        ],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);
      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'd' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'y' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.deleteWorktreeFn).toHaveBeenCalledWith('/tmp/test-repo', '/tmp/test-repo/.worktree/feature', false, true);
    });

    it('confirms deletion when return is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [
          { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
          { name: 'feature', path: '/tmp/test-repo/.worktree/feature', isMain: false, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        ],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);
      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'd' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'return' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.deleteWorktreeFn).toHaveBeenCalled();
    });

    it('cancels deletion when n is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [
          { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
          { name: 'feature', path: '/tmp/test-repo/.worktree/feature', isMain: false, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        ],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);
      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'd' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'n' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.deleteWorktreeFn).not.toHaveBeenCalled();
    });

    it('cancels deletion when escape is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [
          { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
          { name: 'feature', path: '/tmp/test-repo/.worktree/feature', isMain: false, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        ],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);
      keyboardCallback!({ name: 'j' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'd' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'escape' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.deleteWorktreeFn).not.toHaveBeenCalled();
    });

    it('does not show confirmation for main branch', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [
          { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        ],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'd' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.deleteWorktreeFn).not.toHaveBeenCalled();
    });
  });

  describe('bulk deletion confirmation (D key)', () => {
    it('triggers confirmation dialog when D is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [
          { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
          { name: 'merged-branch', path: '/tmp/test-repo/.worktree/merged', isMain: false, locked: false, merged: true, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        ],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'D' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.deleteWorktreesFn).not.toHaveBeenCalled();
    });

    it('confirms bulk deletion when y is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [
          { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
          { name: 'merged-branch', path: '/tmp/test-repo/.worktree/merged', isMain: false, locked: false, merged: true, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        ],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'D' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'y' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.deleteWorktreesFn).toHaveBeenCalledWith([{ root: '/tmp/test-repo', path: '/tmp/test-repo/.worktree/merged', force: false, useTrash: true }]);
    });

    it('cancels bulk deletion when n is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [
          { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
          { name: 'merged-branch', path: '/tmp/test-repo/.worktree/merged', isMain: false, locked: false, merged: true, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        ],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'D' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'n' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.deleteWorktreesFn).not.toHaveBeenCalled();
    });
  });

  describe('project removal confirmation (x key)', () => {
    it('triggers confirmation when x is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'x' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.removeProjectFn).not.toHaveBeenCalled();
    });

    it('confirms removal when y is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'x' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'y' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.removeProjectFn).toHaveBeenCalledWith('p1');
    });

    it('cancels removal when n is pressed', () => {
      const mockProject = {
        id: 'p1',
        name: 'test-project',
        root: '/tmp/test-repo',
        branches: [],
      };

      const state: AppState = {
        cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
        isRefreshing: false,
      };

      const mockService = createMockService(state);
      const { rerender } = render(<App service={mockService as any} />);

      expect(keyboardCallback).not.toBeNull();

      keyboardCallback!({ name: 'x' });
      rerender(<App service={mockService as any} />);

      keyboardCallback!({ name: 'n' });
      rerender(<App service={mockService as any} />);

      expect(mockService._spies.removeProjectFn).not.toHaveBeenCalled();
    });
  });
});

describe('toast notifications', () => {
  const createMockService = (state: AppState) => {
    const deleteWorktreeFn = vi.fn().mockResolvedValue(true);
    const deleteWorktreesFn = vi.fn().mockResolvedValue(true);
    const removeProjectFn = vi.fn();
    const refreshAllThrottledFn = vi.fn();
    const setThemeFn = vi.fn();
    const setTerminalModeFn = vi.fn();
    const getPersistedThemeFn = vi.fn().mockReturnValue(undefined);
    const getPersistedTerminalModeFn = vi.fn().mockReturnValue(undefined);
    const quitFn = vi.fn();
    const openPathFn = vi.fn();
    const openInTerminalFn = vi.fn();
    const getRemoteBranchesFn = vi.fn().mockResolvedValue([]);
    const getLocalBranchesFn = vi.fn().mockResolvedValue([]);
    const createWorktreeFn = vi.fn().mockResolvedValue(undefined);
    const getCandidatesFn = vi.fn().mockResolvedValue([]);
    const confirmAddProjectFn = vi.fn().mockResolvedValue({} as any);
    const lockWorktreeFn = vi.fn().mockResolvedValue(undefined);
    const unlockWorktreeFn = vi.fn().mockResolvedValue(undefined);
    const fetchWorktreeFn = vi.fn().mockResolvedValue(undefined);
    const pullWorktreeFn = vi.fn().mockResolvedValue('');
    const openTerminalFn = vi.fn();

    return {
      getState: () => state,
      subscribe: vi.fn().mockReturnValue(() => {}),
      refreshAllThrottled: refreshAllThrottledFn,
      refreshAll: vi.fn().mockResolvedValue(undefined),
      deleteWorktree: deleteWorktreeFn,
      deleteWorktrees: deleteWorktreesFn,
      removeProject: removeProjectFn,
      setTheme: setThemeFn,
      setTerminalMode: setTerminalModeFn,
      getPersistedTheme: getPersistedThemeFn,
      getPersistedTerminalMode: getPersistedTerminalModeFn,
      quit: quitFn,
      openPath: openPathFn,
      openInTerminal: openInTerminalFn,
      getRemoteBranches: getRemoteBranchesFn,
      getLocalBranches: getLocalBranchesFn,
      createWorktree: createWorktreeFn,
      getCandidates: getCandidatesFn,
      confirmAddProject: confirmAddProjectFn,
      lockWorktree: lockWorktreeFn,
      unlockWorktree: unlockWorktreeFn,
      fetchWorktree: fetchWorktreeFn,
      pullWorktree: pullWorktreeFn,
      openTerminal: openTerminalFn,
      _spies: { deleteWorktreeFn, deleteWorktreesFn, removeProjectFn },
    };
  };

  beforeEach(() => {
    keyboardCallback = null;
  });

  it('dismisses toast on escape key', () => {
    const mockProject = {
      id: 'p1',
      name: 'test-project',
      root: '/tmp/test-repo',
      branches: [
        { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
      ],
    };

    const state: AppState = {
      cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
      isRefreshing: false,
    };

    const mockService = createMockService(state);
    const { rerender } = render(<App service={mockService as any} />);

    expect(keyboardCallback).not.toBeNull();

    // Navigate to main branch and press d (should show error toast)
    keyboardCallback!({ name: 'j' });
    rerender(<App service={mockService as any} />);

    keyboardCallback!({ name: 'd' });
    rerender(<App service={mockService as any} />);

    // Escape should dismiss the toast
    keyboardCallback!({ name: 'escape' });
    rerender(<App service={mockService as any} />);

    // Should be able to navigate without error after dismiss
    keyboardCallback!({ name: 'k' });
    rerender(<App service={mockService as any} />);
  });

  it('shows success toast for delete operation', () => {
    const mockProject = {
      id: 'p1',
      name: 'test-project',
      root: '/tmp/test-repo',
      branches: [
        { name: 'main', path: '/tmp/test-repo', isMain: true, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        { name: 'feature', path: '/tmp/test-repo/.worktree/feature', isMain: false, locked: false, merged: false, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
      ],
    };

    const state: AppState = {
      cfg: { projects: [mockProject], scopeDelim: '/', scopeEnabled: true },
      isRefreshing: false,
    };

    const mockService = createMockService(state);
    const { rerender } = render(<App service={mockService as any} />);

    expect(keyboardCallback).not.toBeNull();

    // Navigate to feature branch
    keyboardCallback!({ name: 'j' });
    rerender(<App service={mockService as any} />);
    keyboardCallback!({ name: 'j' });
    rerender(<App service={mockService as any} />);

    // Press d to confirm deletion
    keyboardCallback!({ name: 'd' });
    rerender(<App service={mockService as any} />);

    // Press y to confirm
    keyboardCallback!({ name: 'y' });
    rerender(<App service={mockService as any} />);

    // Delete should have been called
    expect(mockService._spies.deleteWorktreeFn).toHaveBeenCalled();
  });
});
