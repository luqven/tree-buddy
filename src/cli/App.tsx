import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { AppService, AppState } from '../services/AppService';
import { Project, Branch, WorktreeCandidate } from '../core/types';
import { join, dirname, basename } from 'path';
import { CliPlatformAdapter } from './CliAdapter';
import { 
  getTheme,
  getColors,
  toFg, 
  setTheme,
  setTerminalMode,
  getTerminalMode,
  autoDetectTerminalMode,
  getThemeNames, 
  previewTheme, 
  commitPreview, 
  cancelPreview 
} from './theme';

// Get theme colors helper - returns the palette for current terminal mode
const c = () => getColors();

type Mode = 'normal' | 'help' | 'confirm-delete' | 'add-project' | 'create-worktree' | 'select-branch' | 'command-palette' | 'select-theme';

// Command palette types
interface Command {
  id: string;
  title: string;
  key?: string;
  category: string;
  enabled: boolean;
  onSelect: () => void;
}

interface ActionHint {
  key: string;
  label: string;
  enabled: boolean;
  highlight?: boolean;
}

type SelectedItem = { type: 'project' | 'branch'; data: Project | Branch; project: Project } | undefined;

function getContextualActions(item: SelectedItem, totalItems: number): ActionHint[] {
  // Empty state
  if (totalItems === 0) {
    return [
      { key: 'a', label: 'add project', enabled: true },
      { key: '?', label: 'help', enabled: true },
    ];
  }

  // Project selected
  if (item?.type === 'project') {
    return [
      { key: 'enter', label: 'cd', enabled: true },
      { key: 's', label: 'subshell', enabled: true },
      { key: 'o', label: 'open', enabled: true },
      { key: 'n', label: 'new worktree', enabled: true },
      { key: 'x', label: 'remove', enabled: true },
      { key: '?', label: 'help', enabled: true },
    ];
  }

  // Branch selected
  if (item?.type === 'branch') {
    const br = item.data as Branch;
    const canDelete = !br.isMain && !br.isCurrent && !br.locked;
    const canLock = !br.isMain;
    const canPull = !br.status.dirty;
    const isBehind = br.status.behind > 0;
    const isMerged = br.merged && canDelete;

    return [
      { key: 'enter', label: 'cd', enabled: true },
      { key: 's', label: 'subshell', enabled: true },
      { key: 'd', label: 'delete', enabled: canDelete, highlight: isMerged },
      { key: 'l', label: br.locked ? 'unlock' : 'lock', enabled: canLock },
      { key: 'p', label: 'pull', enabled: canPull, highlight: isBehind && canPull },
      { key: '?', label: 'help', enabled: true },
    ];
  }

  // Fallback
  return [
    { key: 'enter', label: 'cd', enabled: true },
    { key: 's', label: 'subshell', enabled: true },
    { key: '?', label: 'help', enabled: true },
  ];
}

interface ConfirmState {
  msg: string;
  onConfirm: () => void;
}

interface CreateWorktreeState {
  projectId: string;
  projectRoot: string;
  step: 'name' | 'select-base';
  branchName: string;
  branches: string[];
  selectedIdx: number;
}

interface CliPlatformAdapter {
  cdAndQuit: (path: string) => void;
  openSubshell: (path: string) => void;
}

interface AppProps {
  service: AppService;
  adapter?: CliPlatformAdapter;
}

export function App({ service, adapter }: AppProps) {
  const [state, setState] = useState<AppState>(service.getState());
  const { width, height } = useTerminalDimensions();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('normal');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [status, setStatus] = useState<string>('');
  const [candidates, setCandidates] = useState<WorktreeCandidate[]>([]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [createState, setCreateState] = useState<CreateWorktreeState | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Command palette state
  const [paletteFilter, setPaletteFilter] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  
  // Theme selector state
  const [themeIndex, setThemeIndex] = useState(0);
  const themeNames = useMemo(() => getThemeNames(), []);
  
  // Load persisted theme and detect terminal mode on mount
  useEffect(() => {
    // Auto-detect terminal color scheme
    autoDetectTerminalMode();
    
    // Load persisted theme
    const persisted = service.getPersistedTheme();
    if (persisted) {
      setTheme(persisted);
    }
    
    // Load persisted terminal mode (overrides auto-detect if set)
    const persistedMode = service.getPersistedTerminalMode();
    if (persistedMode) {
      setTerminalMode(persistedMode);
    }
  }, [service]);

  useEffect(() => {
    service.refreshAllThrottled();
  }, [service]);

  useEffect(() => {
    return service.subscribe((newState: AppState) => {
      setState(newState);
    });
  }, [service]);

  // Build flat list of navigable items
  const allItems = useMemo(() => {
    const items: { type: 'project' | 'branch'; data: Project | Branch; project: Project }[] = [];
    state.cfg.projects.forEach((p) => {
      items.push({ type: 'project', data: p, project: p });
      p.branches.forEach((b) => {
        items.push({ type: 'branch', data: b, project: p });
      });
    });
    return items;
  }, [state.cfg.projects]);

  const selectedItem = allItems[selectedIndex];

  // Clear status after 3 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showStatus = useCallback((msg: string) => {
    setStatus(msg);
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
  }, []);

  const handleConfirm = useCallback((msg: string, onConfirm: () => void) => {
    setConfirm({ msg, onConfirm });
    setMode('confirm-delete');
  }, []);

  // Load candidates for add-project mode
  const loadCandidates = useCallback(async () => {
    showToast('Scanning for projects...', 'info');
    const c = await service.getCandidates();
    setCandidates(c);
    setCandidateIdx(0);
    setMode('add-project');
    showToast(`Found ${c.length} project(s)`, 'info');
  }, [service, showStatus]);

  // Start create worktree flow
  const startCreateWorktree = useCallback(async () => {
    if (!selectedItem) return;
    const proj = selectedItem.project;
    
    showToast('Loading branches...', 'info');
    const branches = await service.getRemoteBranches(proj.id);
    const localBranches = await service.getLocalBranches(proj.id);
    const allBranches = [...new Set([...localBranches, ...branches])].sort();
    
    setCreateState({
      projectId: proj.id,
      projectRoot: proj.root,
      step: 'name',
      branchName: '',
      branches: allBranches,
      selectedIdx: 0,
    });
    setInputValue('');
    setMode('create-worktree');
    showToast('Enter branch name', 'info');
  }, [selectedItem, service, showStatus]);

  // Build command list for command palette
  const commands = useMemo((): Command[] => {
    const br = selectedItem?.type === 'branch' ? selectedItem.data as Branch : null;
    const proj = selectedItem?.type === 'project' ? selectedItem.data as Project : null;
    const canDelete = br && !br.isMain && !br.isCurrent && !br.locked;
    const canLock = br && !br.isMain;
    const canPull = br && !br.status.dirty;

    return [
      // Navigation
      { id: 'quit', title: 'Quit', key: 'q', category: 'Navigation', enabled: true, onSelect: () => service.quit() },
      
      // Actions
      { id: 'open', title: 'Open in Finder', key: 'o', category: 'Actions', enabled: !!selectedItem, onSelect: () => {
        if (selectedItem) {
          const path = selectedItem.type === 'project' ? (selectedItem.data as Project).root : (selectedItem.data as Branch).path;
          service.openPath(path);
          showToast(`Opened: ${basename(path)}`, 'info');
        }
      }},
      { id: 'terminal', title: 'Open in Terminal', key: 't', category: 'Actions', enabled: !!selectedItem, onSelect: () => {
        if (selectedItem) {
          const path = selectedItem.type === 'project' ? (selectedItem.data as Project).root : (selectedItem.data as Branch).path;
          service.openInTerminal(path);
          showToast(`Terminal: ${basename(path)}`, 'info');
        }
      }},
      { id: 'refresh', title: 'Refresh all', key: 'r', category: 'Actions', enabled: true, onSelect: () => {
        showToast('Refreshing...', 'info');
        service.refreshAll(true).then(() => showToast('Refreshed', 'success'));
      }},
      
      // Worktree
      { id: 'create', title: 'Create new worktree', key: 'n', category: 'Worktree', enabled: !!selectedItem, onSelect: () => startCreateWorktree() },
      { id: 'delete', title: 'Delete worktree', key: 'd', category: 'Worktree', enabled: !!canDelete, onSelect: () => {
        if (selectedItem?.type === 'branch') {
          const brData = selectedItem.data as Branch;
          const msg = brData.status.dirty 
            ? `Delete ${brData.name}? (has uncommitted changes) [y/n]`
            : `Delete ${brData.name}? [y/n]`;
          handleConfirm(msg, () => {
            showToast(`Deleting ${brData.name}...`, 'info');
            service.deleteWorktree(selectedItem.project.root, brData.path, brData.status.dirty, true)
              .then((ok) => showToast(ok ? `Deleted: ${brData.name}` : `Failed to delete: ${brData.name}`, ok ? 'success' : 'error'));
          });
        }
      }},
      { id: 'delete-merged', title: 'Delete all merged', key: 'D', category: 'Worktree', enabled: true, onSelect: () => {
        const merged = allItems.filter((item) => {
          if (item.type !== 'branch') return false;
          const brData = item.data as Branch;
          return brData.merged && !brData.isMain && !brData.isCurrent && !brData.locked && !brData.status.dirty;
        });
        if (merged.length === 0) {
        showToast('No merged branches to clean up', 'info');
          return;
        }
        handleConfirm(`Delete ${merged.length} merged worktree(s)? [y/n]`, () => {
          const items = merged.map((m) => ({
            root: m.project.root,
            path: (m.data as Branch).path,
            force: false,
            useTrash: true,
          }));
          showToast(`Deleting ${items.length} worktrees...`, 'info');
          service.deleteWorktrees(items).then((ok) =>
            showToast(ok ? `Deleted ${items.length} worktrees` : 'Some deletions failed', ok ? 'success' : 'error')
          );
        });
      }},
      { id: 'lock', title: br?.locked ? 'Unlock worktree' : 'Lock worktree', key: 'l', category: 'Worktree', enabled: !!canLock, onSelect: () => {
        if (selectedItem?.type === 'branch') {
          const brData = selectedItem.data as Branch;
          const action = brData.locked ? 'Unlocking' : 'Locking';
          showToast(`${action}...`, 'info');
          const fn = brData.locked ? service.unlockWorktree.bind(service) : service.lockWorktree.bind(service);
          fn(brData.path).then(() => showToast(`${action.replace('ing', 'ed')}: ${brData.name}`, 'success'));
        }
      }},
      
      // Git
      { id: 'fetch', title: 'Fetch', key: 'f', category: 'Git', enabled: !!br, onSelect: () => {
        if (selectedItem?.type === 'branch') {
          const brData = selectedItem.data as Branch;
          showToast(`Fetching ${brData.name}...`, 'info');
          service.fetchWorktree(brData.path).then(() => showToast('Fetch complete', 'success'));
        }
      }},
      { id: 'pull', title: 'Pull', key: 'p', category: 'Git', enabled: !!canPull, onSelect: () => {
        if (selectedItem?.type === 'branch') {
          const brData = selectedItem.data as Branch;
          showToast(`Pulling ${brData.name}...`, 'info');
          service.pullWorktree(brData.path)
            .then(() => showToast('Pull complete', 'success'))
            .catch((err: Error) => showToast(`Pull failed: ${err.message}`, 'error'));
        }
      }},
      
      // Projects
      { id: 'add-project', title: 'Add project', key: 'a', category: 'Projects', enabled: true, onSelect: () => loadCandidates() },
      { id: 'remove-project', title: 'Remove project', key: 'x', category: 'Projects', enabled: !!proj, onSelect: () => {
        if (selectedItem?.type === 'project') {
          const projData = selectedItem.data as Project;
          handleConfirm(`Remove project ${projData.name}? [y/n]`, () => {
            service.removeProject(projData.id);
            showToast(`Removed: ${projData.name}`, 'info');
            setSelectedIndex(Math.max(0, selectedIndex - 1));
          });
        }
      }},
      
      // Settings
      { id: 'theme', title: 'Change theme...', category: 'Settings', enabled: true, onSelect: () => {
        // Find current theme index
        const currentThemeName = getTheme().name;
        const idx = themeNames.indexOf(currentThemeName);
        setThemeIndex(idx >= 0 ? idx : 0);
        setMode('select-theme');
      }},
      { id: 'toggle-mode', title: `Switch to ${getTerminalMode() === 'dark' ? 'light' : 'dark'} mode`, category: 'Settings', enabled: true, onSelect: () => {
        const newMode = getTerminalMode() === 'dark' ? 'light' : 'dark';
        setTerminalMode(newMode);
        service.setTerminalMode(newMode);
        showToast(`Terminal mode: ${newMode}`, 'info');
      }},
      { id: 'help', title: 'Show help', key: '?', category: 'Settings', enabled: true, onSelect: () => setMode('help') },
    ];
  }, [selectedItem, allItems, service, showStatus, handleConfirm, loadCandidates, startCreateWorktree, selectedIndex, themeNames]);

  // Filter commands for palette
  const filteredCommands = useMemo(() => {
    const enabled = commands.filter(c => c.enabled);
    if (!paletteFilter) return enabled;
    const lower = paletteFilter.toLowerCase();
    return enabled.filter(c => 
      c.title.toLowerCase().includes(lower) ||
      c.category.toLowerCase().includes(lower) ||
      c.key?.toLowerCase().includes(lower)
    );
  }, [commands, paletteFilter]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    const order = ['Navigation', 'Actions', 'Worktree', 'Git', 'Projects', 'Settings'];
    
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    
    return order
      .filter(cat => groups[cat]?.length > 0)
      .map(cat => ({ category: cat, commands: groups[cat] }));
  }, [filteredCommands]);

  useKeyboard((event) => {
    // Dismiss toast on escape
    if (toast && event.name === 'escape') {
      setToast(null);
      return;
    }

    // Global quit
    if (event.name === 'c' && event.ctrl) {
      service.quit();
      return;
    }

    // Mode-specific handling
    if (mode === 'help') {
      if (event.name === 'escape' || event.name === 'q' || event.name === '?') {
        setMode('normal');
      }
      return;
    }

    if (mode === 'command-palette') {
      if (event.name === 'escape') {
        setPaletteFilter('');
        setMode('normal');
        return;
      }
      if (event.name === 'up' || (event.name === 'k' && !paletteFilter)) {
        setPaletteIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (event.name === 'down' || (event.name === 'j' && !paletteFilter)) {
        setPaletteIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
        return;
      }
      if (event.name === 'return') {
        const cmd = filteredCommands[paletteIndex];
        if (cmd) {
          setPaletteFilter('');
          setMode('normal');
          cmd.onSelect();
        }
        return;
      }
      if (event.name === 'backspace') {
        setPaletteFilter(prev => prev.slice(0, -1));
        setPaletteIndex(0);
        return;
      }
      // Type to filter
      if (event.sequence && event.sequence.length === 1 && !event.ctrl && !event.meta) {
        setPaletteFilter(prev => prev + event.sequence);
        setPaletteIndex(0);
        return;
      }
      return;
    }

    if (mode === 'select-theme') {
      if (event.name === 'escape') {
        cancelPreview();
        setMode('command-palette');
        return;
      }
      if (event.name === 'up' || event.name === 'k') {
        const newIdx = Math.max(0, themeIndex - 1);
        setThemeIndex(newIdx);
        previewTheme(themeNames[newIdx]);
        return;
      }
      if (event.name === 'down' || event.name === 'j') {
        const newIdx = Math.min(themeNames.length - 1, themeIndex + 1);
        setThemeIndex(newIdx);
        previewTheme(themeNames[newIdx]);
        return;
      }
      if (event.name === 'return') {
        const themeName = commitPreview();
        if (themeName) {
          service.setTheme(themeName);
          showToast(`Theme: ${themeName}`, 'info');
        }
        setMode('normal');
        return;
      }
      return;
    }

    if (mode === 'confirm-delete') {
      if (event.name === 'y' || event.name === 'return') {
        confirm?.onConfirm();
        setConfirm(null);
        setMode('normal');
      } else if (event.name === 'n' || event.name === 'escape') {
        setConfirm(null);
        setMode('normal');
      }
      return;
    }

    if (mode === 'add-project') {
      if (event.name === 'escape' || event.name === 'q') {
        setMode('normal');
        return;
      }
      if (event.name === 'up') {
        setCandidateIdx((prev) => Math.max(0, prev - 1));
        return;
      }
      if (event.name === 'down') {
        setCandidateIdx((prev) => Math.min(candidates.length - 1, prev + 1));
        return;
      }
      if (event.name === 'return' && candidates[candidateIdx]) {
        const c = candidates[candidateIdx];
        service.confirmAddProject(c.path, c.name);
        showToast(`Added project: ${c.name}`, 'success');
        setMode('normal');
        return;
      }
      return;
    }

    if (mode === 'create-worktree' && createState) {
      if (event.name === 'escape') {
        setCreateState(null);
        setMode('normal');
        return;
      }

      if (createState.step === 'name') {
        if (event.name === 'return' && inputValue.trim()) {
          setCreateState({ ...createState, branchName: inputValue.trim(), step: 'select-base' });
          setInputValue('');
          showToast('Select base branch (or press Enter to create from HEAD)', 'info');
          return;
        }
        if (event.name === 'backspace') {
          setInputValue((prev) => prev.slice(0, -1));
          return;
        }
        if (event.sequence && event.sequence.length === 1 && !event.ctrl && !event.meta) {
          setInputValue((prev) => prev + event.sequence);
          return;
        }
        return;
      }

      if (createState.step === 'select-base') {
        if (event.name === 'up') {
          setCreateState({ ...createState, selectedIdx: Math.max(0, createState.selectedIdx - 1) });
          return;
        }
        if (event.name === 'down') {
          setCreateState({ ...createState, selectedIdx: Math.min(createState.branches.length, createState.selectedIdx + 1) });
          return;
        }
        if (event.name === 'return') {
          const baseBranch = createState.selectedIdx === 0 ? undefined : createState.branches[createState.selectedIdx - 1];
          const worktreePath = join(dirname(createState.projectRoot), createState.branchName);
          
          showToast(`Creating worktree ${createState.branchName}...`, 'info');
          service.createWorktree({
            projectId: createState.projectId,
            path: worktreePath,
            branch: createState.branchName,
            createBranch: true,
            baseBranch,
          }).then(() => {
            showToast(`Created worktree: ${createState.branchName}`, 'success');
          }).catch((err: Error) => {
            showToast(`Error: ${err.message}`, 'error');
          });
          
          setCreateState(null);
          setMode('normal');
          return;
        }
        return;
      }
      return;
    }

    // Normal mode
    if (event.name === 'q') {
      service.quit();
      return;
    }

    if (event.name === '?') {
      setMode('help');
      return;
    }

    // Open command palette with /
    if (event.sequence === '/') {
      setPaletteFilter('');
      setPaletteIndex(0);
      setMode('command-palette');
      return;
    }

    if (event.name === 'up' || event.name === 'k') {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (event.name === 'down' || event.name === 'j') {
      setSelectedIndex((prev) => Math.min(allItems.length - 1, prev + 1));
      return;
    }

    // Enter: cd to selected worktree and quit (requires shell alias)
    if (event.name === 'return') {
      if (selectedItem && adapter?.cdAndQuit) {
        const path = selectedItem.type === 'project' 
          ? (selectedItem.data as Project).root 
          : (selectedItem.data as Branch).path;
        adapter.cdAndQuit(path);
      }
      return;
    }

    // s: open subshell in selected worktree
    if (event.name === 's') {
      if (selectedItem && adapter?.openSubshell) {
        const path = selectedItem.type === 'project' 
          ? (selectedItem.data as Project).root 
          : (selectedItem.data as Branch).path;
        adapter.openSubshell(path);
      }
      return;
    }

    if (event.name === 'r') {
      showToast('Refreshing...', 'info');
      service.refreshAll(true).then(() => showToast('Refreshed', 'success'));
      return;
    }

    if (event.name === 'o') {
      if (selectedItem) {
        const path = selectedItem.type === 'project' 
          ? (selectedItem.data as Project).root 
          : (selectedItem.data as Branch).path;
        service.openPath(path);
        showToast(`Opened: ${basename(path)}`, 'info');
      }
      return;
    }

    if (event.name === 't') {
      if (selectedItem) {
        const path = selectedItem.type === 'project' 
          ? (selectedItem.data as Project).root 
          : (selectedItem.data as Branch).path;
        service.openInTerminal(path);
        showToast(`Terminal: ${basename(path)}`, 'info');
      }
      return;
    }

    if (event.name === 'l') {
      if (selectedItem?.type === 'branch') {
        const br = selectedItem.data as Branch;
        if (br.isMain) {
          showToast('Cannot lock main worktree', 'error');
          return;
        }
        const action = br.locked ? 'Unlocking' : 'Locking';
        showToast(`${action}...`, 'info');
        const fn = br.locked ? service.unlockWorktree.bind(service) : service.lockWorktree.bind(service);
        fn(br.path).then(() => showToast(`${action.replace('ing', 'ed')}: ${br.name}`, 'success'));
      }
      return;
    }

    if (event.name === 'd') {
      if (selectedItem?.type === 'branch') {
        const br = selectedItem.data as Branch;
        if (br.isMain || br.isCurrent) {
          showToast('Cannot delete main/current worktree', 'error');
          return;
        }
        if (br.locked) {
          showToast('Cannot delete locked worktree', 'error');
          return;
        }

        const msg = br.status.dirty
          ? `Delete ${br.name}? (has uncommitted changes) [y/n]`
          : `Delete ${br.name}? [y/n]`;

        handleConfirm(msg, () => {
          showToast(`Deleting ${br.name}...`, 'info');
          service.deleteWorktree(selectedItem.project.root, br.path, br.status.dirty, true)
            .then((ok) => showToast(ok ? `Deleted: ${br.name}` : `Failed to delete: ${br.name}`, ok ? 'success' : 'error'));
        });
      }
      return;
    }

    if (event.name === 'D') {
      // Bulk delete merged branches
      const merged = allItems.filter((item) => {
        if (item.type !== 'branch') return false;
        const br = item.data as Branch;
        return br.merged && !br.isMain && !br.isCurrent && !br.locked && !br.status.dirty;
      });

      if (merged.length === 0) {
        showToast('No merged branches to clean up', 'info');
        return;
      }

      handleConfirm(`Delete ${merged.length} merged worktree(s)? [y/n]`, () => {
        const items = merged.map((m) => ({
          root: m.project.root,
          path: (m.data as Branch).path,
          force: false,
          useTrash: true,
        }));
        showToast(`Deleting ${items.length} worktrees...`, 'info');
        service.deleteWorktrees(items).then((ok) =>
          showToast(ok ? `Deleted ${items.length} worktrees` : 'Some deletions failed', ok ? 'success' : 'error')
        );
      });
      return;
    }

    if (event.name === 'f') {
      if (selectedItem?.type === 'branch') {
        const br = selectedItem.data as Branch;
        showToast(`Fetching ${br.name}...`, 'info');
        service.fetchWorktree(br.path).then(() => showToast('Fetch complete', 'success'));
      }
      return;
    }

    if (event.name === 'p') {
      if (selectedItem?.type === 'branch') {
        const br = selectedItem.data as Branch;
        if (br.status.dirty) {
          showStatus('Cannot pull: uncommitted changes');
          return;
        }
        showStatus(`Pulling ${br.name}...`);
        service.pullWorktree(br.path)
          .then(() => showToast('Pull complete', 'success'))
          .catch((err: Error) => showToast(`Pull failed: ${err.message}`, 'error'));
      }
      return;
    }

    if (event.name === 'a') {
      loadCandidates();
      return;
    }

    if (event.name === 'x') {
      if (selectedItem?.type === 'project') {
        const proj = selectedItem.data as Project;
        handleConfirm(`Remove project ${proj.name}? [y/n]`, () => {
          service.removeProject(proj.id);
          showToast(`Removed: ${proj.name}`, 'info');
          setSelectedIndex(Math.max(0, selectedIndex - 1));
        });
      }
      return;
    }

    if (event.name === 'n') {
      startCreateWorktree();
      return;
    }
  });

  // Render help overlay
  if (mode === 'help') {
    const theme = c();
    const text = toFg(theme.text);
    const primary = toFg(theme.primary);
    const highlight = toFg(theme.actionHighlight);
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box border borderColor={toFg(theme.border)} title="Help - Press ? or q to close" flexGrow={1}>
          <box flexDirection="column" style={{ padding: 1 }}>
            <text bold fg={primary}>Navigation</text>
            <text fg={text}>  <span fg={highlight}>↑/k</span>    Move up</text>
            <text fg={text}>  <span fg={highlight}>↓/j</span>    Move down</text>
            <text fg={text}>  <span fg={highlight}>enter</span>  cd to worktree (needs alias)</text>
            <text fg={text}>  <span fg={highlight}>s</span>      Open subshell in worktree</text>
            <text fg={text}>  <span fg={highlight}>q</span>      Quit</text>
            <text fg={text}>  <span fg={highlight}>/</span>      Command palette</text>
            <text fg={text}> </text>
            <text bold fg={primary}>Actions</text>
            <text fg={text}>  <span fg={highlight}>o</span>      Open in Finder</text>
            <text fg={text}>  <span fg={highlight}>t</span>      Open in Terminal</text>
            <text fg={text}>  <span fg={highlight}>r</span>      Refresh all</text>
            <text fg={text}> </text>
            <text bold fg={primary}>Worktree Management</text>
            <text fg={text}>  <span fg={highlight}>n</span>      Create new worktree</text>
            <text fg={text}>  <span fg={highlight}>d</span>      Delete worktree</text>
            <text fg={text}>  <span fg={highlight}>D</span>      Delete all merged</text>
            <text fg={text}>  <span fg={highlight}>l</span>      Toggle lock</text>
            <text fg={text}> </text>
            <text bold fg={primary}>Git Operations</text>
            <text fg={text}>  <span fg={highlight}>f</span>      Fetch</text>
            <text fg={text}>  <span fg={highlight}>p</span>      Pull</text>
            <text fg={text}> </text>
            <text bold fg={primary}>Projects</text>
            <text fg={text}>  <span fg={highlight}>a</span>      Add project</text>
            <text fg={text}>  <span fg={highlight}>x</span>      Remove project</text>
          </box>
        </box>
      </box>
    );
  }

  // Render command palette
  if (mode === 'command-palette') {
    const theme = c();
    const textColor = toFg(theme.text);
    const primaryColor = toFg(theme.primary);
    const selectionColor = toFg(theme.selection);
    const mutedColor = toFg(theme.textMuted);
    const borderColor = toFg(theme.border);
    
    // Pre-compute flat command list with indices
    const flatCommands: Array<{ cmd: Command; groupIdx: number; isFirst: boolean; category: string }> = [];
    groupedCommands.forEach((group, groupIdx) => {
      group.commands.forEach((cmd, cmdIdx) => {
        flatCommands.push({ cmd, groupIdx, isFirst: cmdIdx === 0, category: group.category });
      });
    });
    
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box border borderColor={borderColor} title="Commands - Type to filter, Esc to close" flexGrow={1}>
          <box flexDirection="column" style={{ padding: 1 }}>
            {/* Filter input */}
            <text fg={textColor}>
              <span fg={primaryColor}>&gt; </span>
              {paletteFilter}
              <span fg={mutedColor}>_</span>
            </text>
            <text fg={textColor}> </text>
            
            {/* Flat command list */}
            <scrollbox flexGrow={1} focused>
              {flatCommands.length === 0 ? (
                <text fg={mutedColor}>No matching commands</text>
              ) : (
                flatCommands.map((item, idx) => {
                  const isSelected = idx === paletteIndex;
                  return (
                    <box key={item.cmd.id} flexDirection="column">
                      {item.isFirst && <text bold fg={mutedColor}>{item.category}</text>}
                      <box style={{ paddingLeft: 2 }}>
                        <text fg={isSelected ? selectionColor : textColor}>
                          {isSelected ? '> ' : '  '}{item.cmd.title}
                          {item.cmd.key && <span fg={mutedColor}>  {item.cmd.key}</span>}
                        </text>
                      </box>
                    </box>
                  );
                })
              )}
            </scrollbox>
          </box>
        </box>
      </box>
    );
  }

  // Render theme selector
  if (mode === 'select-theme') {
    const theme = c();
    const text = toFg(theme.text);
    const primary = toFg(theme.primary);
    const selection = toFg(theme.selection);
    const muted = toFg(theme.textMuted);
    const border = toFg(theme.border);
    
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box border borderColor={border} title="Select Theme - ↑/↓ preview, Enter apply, Esc cancel" flexGrow={1}>
          <box flexDirection="column" style={{ padding: 1 }}>
            <scrollbox flexGrow={1} focused>
              {themeNames.map((name, i) => {
                const isSelected = i === themeIndex;
                return (
                  <box key={name} style={{ paddingLeft: 1 }}>
                    <text fg={isSelected ? selection : text}>
                      {isSelected ? '> ' : '  '}{name}
                    </text>
                  </box>
                );
              })}
            </scrollbox>
            <text fg={text}> </text>
            <text fg={muted}>Current: {getTheme().name}</text>
          </box>
        </box>
      </box>
    );
  }

  // Render add-project overlay
  if (mode === 'add-project') {
    const theme = c();
    const text = toFg(theme.text);
    const selection = toFg(theme.selection);
    const muted = toFg(theme.textMuted);
    const border = toFg(theme.border);
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box border borderColor={border} title="Add Project - ↑/↓ select, Enter add, Esc cancel" flexGrow={1}>
          <scrollbox flexGrow={1} focused>
            {candidates.length === 0 ? (
              <text fg={muted}>No new projects found</text>
            ) : (
              candidates.map((cand, i) => (
                <box key={cand.path} style={{ paddingLeft: 1 }}>
                  <text fg={text}>
                    <span fg={i === candidateIdx ? selection : text}>{i === candidateIdx ? '> ' : '  '}{cand.name}</span>
                    <span fg={muted}> ({cand.branchCount} branches)</span>
                  </text>
                </box>
              ))
            )}
          </scrollbox>
        </box>
      </box>
    );
  }

  // Render create-worktree overlay
  if (mode === 'create-worktree' && createState) {
    const theme = c();
    const text = toFg(theme.text);
    const primary = toFg(theme.primary);
    const highlight = toFg(theme.actionHighlight);
    const selection = toFg(theme.selection);
    const muted = toFg(theme.textMuted);
    const border = toFg(theme.border);
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box border borderColor={border} title="Create Worktree - Esc cancel" flexGrow={1}>
          <box flexDirection="column" style={{ padding: 1 }}>
            {createState.step === 'name' ? (
              <>
                <text fg={primary}>Enter new branch name:</text>
                <text fg={text}> </text>
                <text fg={text}>
                  <span fg={text}>&gt; </span>
                  <span fg={highlight}>{inputValue}</span>
                  <span fg={muted}>_</span>
                </text>
              </>
            ) : (
              <>
                <text fg={primary}>Select base branch for: <span fg={highlight}>{createState.branchName}</span></text>
                <text fg={muted}>(Press Enter on HEAD to create from current)</text>
                <text fg={text}> </text>
                <scrollbox flexGrow={1} focused>
                  <box style={{ paddingLeft: 1 }}>
                    <text fg={createState.selectedIdx === 0 ? selection : text}>{createState.selectedIdx === 0 ? '> ' : '  '}[HEAD - current]</text>
                  </box>
                  {createState.branches.map((br, i) => (
                    <box key={br} style={{ paddingLeft: 1 }}>
                      <text fg={i + 1 === createState.selectedIdx ? selection : text}>{i + 1 === createState.selectedIdx ? '> ' : '  '}{br}</text>
                    </box>
                  ))}
                </scrollbox>
              </>
            )}
          </box>
        </box>
      </box>
    );
  }

  // Render confirm dialog
  if (mode === 'confirm-delete' && confirm) {
    const theme = c();
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box flexGrow={1} />
        <box border borderColor={toFg(theme.border)} style={{ padding: 1 }}>
          <text fg={toFg(theme.warning)}>{confirm.msg}</text>
        </box>
        <box flexGrow={1} />
      </box>
    );
  }

  // Main view
  return (
    <box flexDirection="column" style={{ width, height, padding: 1 }}>
      <box style={{ marginBottom: 1 }}>
        <text fg={toFg(c().text)}>
          <span fg={toFg(c().primary)} bold>Tree Buddy</span>
          <span fg={toFg(c().textMuted)}> | / commands | ? help | q quit</span>
        </text>
      </box>

      <scrollbox flexGrow={1} border borderColor={toFg(c().border)} title="Projects" focused>
        {allItems.length === 0 ? (
          <box style={{ padding: 1 }}>
            <text fg={toFg(c().textMuted)}>No projects. Press 'a' to add one.</text>
          </box>
        ) : (
          allItems.map((item, i) => {
            const isSelected = i === selectedIndex;
            const marker = isSelected ? '>' : ' ';
            const theme = c();
            if (item.type === 'project') {
              const p = item.data as Project;
              return (
                <box key={p.id} style={{ paddingLeft: 1 }}>
                  <text bold fg={toFg(isSelected ? theme.selection : theme.warning)}>{marker} {p.name}</text>
                  <text fg={toFg(c().textMuted)}> ({p.branches.length})</text>
                </box>
              );
            } else {
              const br = item.data as Branch;
              return (
                <box key={`${item.project.id}-${br.name}`} style={{ paddingLeft: 3 }}>
                  <text fg={toFg(theme.text)}>
                    <span fg={toFg(isSelected ? theme.selection : theme.text)}>{marker} </span>
                    <BranchStatusIndicator branch={br} />
                    <span fg={toFg(isSelected ? theme.selection : theme.text)} bold={isSelected}>{br.name}</span>
                    <BranchBadges branch={br} />
                  </text>
                </box>
              );
            }
          })
        )}
      </scrollbox>

      {/* Footer: Status line + Action bar */}
      <box flexDirection="column" style={{ marginTop: 1 }}>
        {/* Toast notification */}
        <Toast toast={toast} />

        {/* Line 1: Status */}
        <box style={{ height: 1 }}>
          <StatusLine
            isRefreshing={state.isRefreshing}
            status={status}
            selectedItem={selectedItem}
          />
        </box>
        
        {/* Line 2: Contextual action hints */}
        <box style={{ height: 1 }}>
          <ActionBar actions={getContextualActions(selectedItem, allItems.length)} />
        </box>
      </box>
    </box>
  );
}

function Toast({ toast }: { toast: { msg: string; type: 'success' | 'error' | 'info' } | null }) {
  const theme = c();
  if (!toast) return null;

  const bgColor = toast.type === 'success' ? theme.success : toast.type === 'error' ? theme.error : theme.info;
  const fgColor = toast.type === 'info' ? '#ffffff' : '#000000';

  return (
    <box
      position={{ right: 0, bottom: 0 }}
      width={toast.msg.length + 4}
      height={3}
      border={{ type: 'line', color: bgColor }}
      background={bgColor}
    >
      <text color={fgColor} bold>{toast.msg}</text>
    </box>
  );
}

function BranchStatusIndicator({ branch }: { branch: Branch }) {
  const theme = c();
  if (branch.status.behind > 0) {
    return <span fg={toFg(theme.error)}>● </span>;
  }
  if (branch.status.dirty) {
    return <span fg={toFg(theme.warning)}>● </span>;
  }
  return <span fg={toFg(theme.success)}>● </span>;
}

function BranchBadges({ branch }: { branch: Branch }) {
  const theme = c();
  const badges: React.ReactNode[] = [];
  
  if (branch.locked) {
    badges.push(<span key="lock" fg={toFg(theme.badgeLocked)}> [locked]</span>);
  }
  if (branch.merged) {
    badges.push(<span key="merged" fg={toFg(theme.badgeMerged)}> [merged]</span>);
  }
  if (branch.isMain) {
    badges.push(<span key="main" fg={toFg(theme.badgeMain)}> [main]</span>);
  }
  if (branch.status.ahead > 0) {
    badges.push(<span key="ahead" fg={toFg(theme.info)}> ↑{branch.status.ahead}</span>);
  }
  if (branch.status.behind > 0) {
    badges.push(<span key="behind" fg={toFg(theme.error)}> ↓{branch.status.behind}</span>);
  }
  
  return <>{badges}</>;
}

function BranchDetails({ branch }: { branch: Branch }) {
  const parts: string[] = [];
  
  if (branch.status.dirty) parts.push('uncommitted changes');
  if (branch.status.ahead > 0) parts.push(`${branch.status.ahead} ahead`);
  if (branch.status.behind > 0) parts.push(`${branch.status.behind} behind`);
  if (branch.locked) parts.push('locked');
  if (branch.merged) parts.push('merged');
  
  const status = parts.length > 0 ? parts.join(' | ') : 'clean';
  
  return (
    <text fg={toFg(c().textMuted)}>
      {branch.name}: {status}
    </text>
  );
}

function ActionBar({ actions }: { actions: ActionHint[] }) {
  const theme = c();
  return (
    <text fg={toFg(theme.text)}>
      {actions.map((action, i) => {
        const isDim = !action.enabled;
        const isHighlight = action.enabled && action.highlight;
        const keyColor = isDim ? toFg(theme.actionDisabled) : isHighlight ? toFg(theme.actionHighlight) : toFg(theme.actionKey);
        const labelColor = isDim ? toFg(theme.actionDisabled) : isHighlight ? toFg(theme.actionHighlight) : toFg(theme.text);
        return (
          <span key={action.key} fg={toFg(theme.text)}>
            {i > 0 && <span fg={toFg(theme.text)}>  </span>}
            <span fg={keyColor}>[{action.key}]</span>
            <span fg={labelColor}> {action.label}</span>
          </span>
        );
      })}
    </text>
  );
}

function StatusLine({ 
  isRefreshing, 
  status, 
  selectedItem 
}: { 
  isRefreshing: boolean; 
  status: string; 
  selectedItem: SelectedItem;
}) {
  const theme = c();
  if (isRefreshing) {
    return <text fg={toFg(theme.info)}>Refreshing...</text>;
  }
  
  if (status) {
    return <text fg={toFg(theme.success)}>{status}</text>;
  }
  
  if (selectedItem?.type === 'branch') {
    return <BranchDetails branch={selectedItem.data as Branch} />;
  }
  
  if (selectedItem?.type === 'project') {
    const proj = selectedItem.data as Project;
    return <text fg={toFg(theme.textMuted)}>{proj.root}</text>;
  }
  
  return <text fg={toFg(theme.textMuted)}>No selection</text>;
}
