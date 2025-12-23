import { useState, useEffect, useCallback } from 'react';
import type { Config, WorktreeCandidate } from '@core/types';
import { getCleanupItems } from '@core/types';

interface AppState {
  cfg: Config;
  isRefreshing: boolean;
}

const defaultState: AppState = {
  cfg: {
    scopeDelim: '/',
    scopeEnabled: true,
    projects: [],
  },
  isRefreshing: false,
};

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [candidates, setCandidates] = useState<WorktreeCandidate[]>([]);
  const [deletingPaths, setDeletingPaths] = useState<Set<string>>(new Set());

  // Load initial state, subscribe to updates, and trigger refresh on open
  useEffect(() => {
    const api = window.treeBuddy;
    if (!api) return;

    // Get initial state
    api.getState().then((s) => {
      setState(s);
    });

    // Trigger throttled refresh on window open
    api.windowShown();

    // Subscribe to updates
    const unsubscribeState = api.onStateUpdate((s) => {
      setState(s);
    });

    // Subscribe to deletion progress updates
    const unsubscribeProgress = api.onDeletionProgress(({ path, status }) => {
      if (status === 'started') {
        setDeletingPaths(prev => new Set([...prev, path]));
      } else {
        setDeletingPaths(prev => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeProgress();
    };
  }, []);

  const refreshAll = useCallback(async () => {
    await window.treeBuddy?.refreshAll();
  }, []);

  const refreshProject = useCallback(async (id: string) => {
    await window.treeBuddy?.refreshProject(id);
  }, []);

  const addProject = useCallback(async () => {
    const result = await window.treeBuddy?.getCandidates();
    if (result) {
      setCandidates(result);
      setShowAddDialog(true);
    }
  }, []);

  const confirmAddProject = useCallback(async (path: string, name: string) => {
    await window.treeBuddy?.confirmAddProject(path, name);
    setShowAddDialog(false);
  }, []);

  const removeProject = useCallback(async (id: string) => {
    await window.treeBuddy?.removeProject(id);
  }, []);

  const openPath = useCallback(async (path: string) => {
    await window.treeBuddy?.openPath(path);
  }, []);

  const showInFolder = useCallback(async (path: string) => {
    await window.treeBuddy?.showInFolder(path);
  }, []);

  const lockWorktree = useCallback(async (path: string) => {
    await window.treeBuddy?.lockWorktree(path);
  }, []);

  const unlockWorktree = useCallback(async (path: string) => {
    await window.treeBuddy?.unlockWorktree(path);
  }, []);

  const cleanupAllMerged = useCallback(async () => {
    const items = getCleanupItems(state.cfg.projects, 'broom');
    if (items.length === 0) return;

    const confirmed = window.confirm(`Delete ${items.length} merged worktrees?`);
    if (!confirmed) return;

    await window.treeBuddy?.deleteWorktrees(items);
  }, [state.cfg.projects]);

  const cleanupAllUnprotected = useCallback(async () => {
    const items = getCleanupItems(state.cfg.projects, 'trash');
    if (items.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${items.length} unprotected worktrees? Warning: This will delete unmerged worktrees.`
    );
    if (!confirmed) return;

    await window.treeBuddy?.deleteWorktrees(items);
  }, [state.cfg.projects]);

  const updateConfig = useCallback(async (updates: Partial<Config>) => {
    await window.treeBuddy?.updateConfig(updates);
  }, []);

  const quit = useCallback(async () => {
    await window.treeBuddy?.quit();
  }, []);

  return {
    cfg: state.cfg,
    projects: state.cfg.projects,
    isRefreshing: state.isRefreshing,
    showAddDialog,
    setShowAddDialog,
    candidates,
    refreshAll,
    refreshProject,
    addProject,
    confirmAddProject,
    removeProject,
    openPath,
    showInFolder,
    lockWorktree,
    unlockWorktree,
    cleanupAllMerged,
    cleanupAllUnprotected,
    updateConfig,
    quit,
    deletingPaths,
  };
}
