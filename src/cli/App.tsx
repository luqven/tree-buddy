import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { AppService, AppState } from '../services/AppService';
import { Project, Branch, WorktreeCandidate } from '../core/types';
import { join, dirname, basename } from 'path';
import { getTheme, toFg } from './theme';

// Get theme colors helper
const t = () => getTheme().colors;

type Mode = 'normal' | 'help' | 'confirm-delete' | 'add-project' | 'create-worktree' | 'select-branch';

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
      { key: 'o', label: 'open', enabled: true },
      { key: 't', label: 'terminal', enabled: true },
      { key: 'n', label: 'new worktree', enabled: true },
      { key: 'x', label: 'remove', enabled: true },
      { key: 'a', label: 'add project', enabled: true },
      { key: 'r', label: 'refresh', enabled: true },
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
      { key: 'o', label: 'open', enabled: true },
      { key: 't', label: 'terminal', enabled: true },
      { key: 'n', label: 'new', enabled: true },
      { key: 'd', label: 'delete', enabled: canDelete, highlight: isMerged },
      { key: 'l', label: br.locked ? 'unlock' : 'lock', enabled: canLock },
      { key: 'f', label: 'fetch', enabled: true },
      { key: 'p', label: 'pull', enabled: canPull, highlight: isBehind && canPull },
      { key: '?', label: 'help', enabled: true },
    ];
  }

  // Fallback
  return [
    { key: 'o', label: 'open', enabled: true },
    { key: 't', label: 'terminal', enabled: true },
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

export function App({ service }: { service: AppService }) {
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

  const showStatus = useCallback((msg: string) => {
    setStatus(msg);
  }, []);

  const handleConfirm = useCallback((msg: string, onConfirm: () => void) => {
    setConfirm({ msg, onConfirm });
    setMode('confirm-delete');
  }, []);

  // Load candidates for add-project mode
  const loadCandidates = useCallback(async () => {
    showStatus('Scanning for projects...');
    const c = await service.getCandidates();
    setCandidates(c);
    setCandidateIdx(0);
    setMode('add-project');
    showStatus(`Found ${c.length} project(s)`);
  }, [service, showStatus]);

  // Start create worktree flow
  const startCreateWorktree = useCallback(async () => {
    if (!selectedItem) return;
    const proj = selectedItem.project;
    
    showStatus('Loading branches...');
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
    showStatus('Enter branch name');
  }, [selectedItem, service, showStatus]);

  useKeyboard((event) => {
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
        showStatus(`Added project: ${c.name}`);
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
          showStatus('Select base branch (or press Enter to create from HEAD)');
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
          
          showStatus(`Creating worktree ${createState.branchName}...`);
          service.createWorktree({
            projectId: createState.projectId,
            path: worktreePath,
            branch: createState.branchName,
            createBranch: true,
            baseBranch,
          }).then(() => {
            showStatus(`Created worktree: ${createState.branchName}`);
          }).catch((err: Error) => {
            showStatus(`Error: ${err.message}`);
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

    if (event.name === 'up' || event.name === 'k') {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (event.name === 'down' || event.name === 'j') {
      setSelectedIndex((prev) => Math.min(allItems.length - 1, prev + 1));
      return;
    }

    if (event.name === 'r') {
      showStatus('Refreshing...');
      service.refreshAll(true).then(() => showStatus('Refreshed'));
      return;
    }

    if (event.name === 'o') {
      if (selectedItem) {
        const path = selectedItem.type === 'project' 
          ? (selectedItem.data as Project).root 
          : (selectedItem.data as Branch).path;
        service.openPath(path);
        showStatus(`Opened: ${basename(path)}`);
      }
      return;
    }

    if (event.name === 't') {
      if (selectedItem) {
        const path = selectedItem.type === 'project' 
          ? (selectedItem.data as Project).root 
          : (selectedItem.data as Branch).path;
        service.openInTerminal(path);
        showStatus(`Terminal: ${basename(path)}`);
      }
      return;
    }

    if (event.name === 'l') {
      if (selectedItem?.type === 'branch') {
        const br = selectedItem.data as Branch;
        if (br.isMain) {
          showStatus('Cannot lock main worktree');
          return;
        }
        const action = br.locked ? 'Unlocking' : 'Locking';
        showStatus(`${action}...`);
        const fn = br.locked ? service.unlockWorktree.bind(service) : service.lockWorktree.bind(service);
        fn(br.path).then(() => showStatus(`${action.replace('ing', 'ed')}: ${br.name}`));
      }
      return;
    }

    if (event.name === 'd') {
      if (selectedItem?.type === 'branch') {
        const br = selectedItem.data as Branch;
        if (br.isMain || br.isCurrent) {
          showStatus('Cannot delete main/current worktree');
          return;
        }
        if (br.locked) {
          showStatus('Cannot delete locked worktree');
          return;
        }
        
        const msg = br.status.dirty 
          ? `Delete ${br.name}? (has uncommitted changes) [y/n]`
          : `Delete ${br.name}? [y/n]`;
        
        handleConfirm(msg, () => {
          showStatus(`Deleting ${br.name}...`);
          service.deleteWorktree(selectedItem.project.root, br.path, br.status.dirty, true)
            .then((ok) => showStatus(ok ? `Deleted: ${br.name}` : `Failed to delete: ${br.name}`));
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
        showStatus('No merged branches to clean up');
        return;
      }

      handleConfirm(`Delete ${merged.length} merged worktree(s)? [y/n]`, () => {
        const items = merged.map((m) => ({
          root: m.project.root,
          path: (m.data as Branch).path,
          force: false,
          useTrash: true,
        }));
        showStatus(`Deleting ${items.length} worktrees...`);
        service.deleteWorktrees(items).then((ok) => 
          showStatus(ok ? `Deleted ${items.length} worktrees` : 'Some deletions failed')
        );
      });
      return;
    }

    if (event.name === 'f') {
      if (selectedItem?.type === 'branch') {
        const br = selectedItem.data as Branch;
        showStatus(`Fetching ${br.name}...`);
        service.fetchWorktree(br.path).then(() => showStatus('Fetch complete'));
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
          .then(() => showStatus('Pull complete'))
          .catch((err: Error) => showStatus(`Pull failed: ${err.message}`));
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
          showStatus(`Removed: ${proj.name}`);
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
    const theme = t();
    const primary = toFg(theme.primary);
    const highlight = toFg(theme.actionHighlight);
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box border title="Help - Press ? or q to close" flexGrow={1}>
          <box flexDirection="column" style={{ padding: 1 }}>
            <text bold fg={primary}>Navigation</text>
            <text>  <span fg={highlight}>↑/k</span>  Move up</text>
            <text>  <span fg={highlight}>↓/j</span>  Move down</text>
            <text>  <span fg={highlight}>q</span>    Quit</text>
            <text> </text>
            <text bold fg={primary}>Actions</text>
            <text>  <span fg={highlight}>o</span>    Open in Finder</text>
            <text>  <span fg={highlight}>t</span>    Open in Terminal</text>
            <text>  <span fg={highlight}>r</span>    Refresh all</text>
            <text> </text>
            <text bold fg={primary}>Worktree Management</text>
            <text>  <span fg={highlight}>n</span>    Create new worktree</text>
            <text>  <span fg={highlight}>d</span>    Delete worktree</text>
            <text>  <span fg={highlight}>D</span>    Delete all merged worktrees</text>
            <text>  <span fg={highlight}>l</span>    Toggle lock</text>
            <text> </text>
            <text bold fg={primary}>Git Operations</text>
            <text>  <span fg={highlight}>f</span>    Fetch</text>
            <text>  <span fg={highlight}>p</span>    Pull</text>
            <text> </text>
            <text bold fg={primary}>Projects</text>
            <text>  <span fg={highlight}>a</span>    Add project</text>
            <text>  <span fg={highlight}>x</span>    Remove project</text>
          </box>
        </box>
      </box>
    );
  }

  // Render add-project overlay
  if (mode === 'add-project') {
    const theme = t();
    const selection = toFg(theme.selection);
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box border title="Add Project - ↑/↓ select, Enter add, Esc cancel" flexGrow={1}>
          <scrollbox flexGrow={1} focused>
            {candidates.length === 0 ? (
              <text dim>No new projects found</text>
            ) : (
              candidates.map((c, i) => (
                <box key={c.path} style={{ paddingLeft: 1 }}>
                  <text>
                    <span fg={i === candidateIdx ? selection : undefined}>{i === candidateIdx ? '> ' : '  '}{c.name}</span>
                    <span dim> ({c.branchCount} branches)</span>
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
    const theme = t();
    const primary = toFg(theme.primary);
    const highlight = toFg(theme.actionHighlight);
    const selection = toFg(theme.selection);
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box border title="Create Worktree - Esc cancel" flexGrow={1}>
          <box flexDirection="column" style={{ padding: 1 }}>
            {createState.step === 'name' ? (
              <>
                <text fg={primary}>Enter new branch name:</text>
                <text> </text>
                <text>
                  <span>&gt; </span>
                  <span fg={highlight}>{inputValue}</span>
                  <span>_</span>
                </text>
              </>
            ) : (
              <>
                <text fg={primary}>Select base branch for: <span fg={highlight}>{createState.branchName}</span></text>
                <text dim>(Press Enter on HEAD to create from current)</text>
                <text> </text>
                <scrollbox flexGrow={1} focused>
                  <box style={{ paddingLeft: 1 }}>
                    <text fg={createState.selectedIdx === 0 ? selection : undefined}>{createState.selectedIdx === 0 ? '> ' : '  '}[HEAD - current]</text>
                  </box>
                  {createState.branches.map((br, i) => (
                    <box key={br} style={{ paddingLeft: 1 }}>
                      <text fg={i + 1 === createState.selectedIdx ? selection : undefined}>{i + 1 === createState.selectedIdx ? '> ' : '  '}{br}</text>
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
    return (
      <box flexDirection="column" style={{ width, height, padding: 1 }}>
        <box flexGrow={1} />
        <box border style={{ padding: 1 }}>
          <text fg={toFg(t().warning)}>{confirm.msg}</text>
        </box>
        <box flexGrow={1} />
      </box>
    );
  }

  // Main view
  return (
    <box flexDirection="column" style={{ width, height, padding: 1 }}>
      <box style={{ marginBottom: 1 }}>
        <text>
          <span fg={toFg(t().primary)} bold>Tree Buddy</span>
          <span dim> | ? help | q quit</span>
        </text>
      </box>

      <scrollbox flexGrow={1} border title="Projects" focused>
        {allItems.length === 0 ? (
          <box style={{ padding: 1 }}>
            <text dim>No projects. Press 'a' to add one.</text>
          </box>
        ) : (
          allItems.map((item, i) => {
            const isSelected = i === selectedIndex;
            const marker = isSelected ? '>' : ' ';
            const theme = t();
            if (item.type === 'project') {
              const p = item.data as Project;
              return (
                <box key={p.id} style={{ paddingLeft: 1 }}>
                  <text bold fg={toFg(isSelected ? theme.selection : theme.warning)}>{marker} {p.name}</text>
                  <text dim> ({p.branches.length})</text>
                </box>
              );
            } else {
              const br = item.data as Branch;
              return (
                <box key={`${item.project.id}-${br.name}`} style={{ paddingLeft: 3 }}>
                  <text>
                    <span fg={toFg(isSelected ? theme.selection : undefined)}>{marker} </span>
                    <BranchStatusIndicator branch={br} />
                    <span fg={toFg(isSelected ? theme.selection : undefined)} bold={isSelected}>{br.name}</span>
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

function BranchStatusIndicator({ branch }: { branch: Branch }) {
  const theme = t();
  if (branch.status.behind > 0) {
    return <span fg={toFg(theme.error)}>● </span>;
  }
  if (branch.status.dirty) {
    return <span fg={toFg(theme.warning)}>● </span>;
  }
  return <span fg={toFg(theme.success)}>● </span>;
}

function BranchBadges({ branch }: { branch: Branch }) {
  const theme = t();
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
    <text dim>
      {branch.name}: {status}
    </text>
  );
}

function ActionBar({ actions }: { actions: ActionHint[] }) {
  const theme = t();
  return (
    <text>
      {actions.map((action, i) => {
        const isDim = !action.enabled;
        const isHighlight = action.enabled && action.highlight;
        const keyColor = isDim ? toFg(theme.actionDisabled) : isHighlight ? toFg(theme.actionHighlight) : toFg(theme.actionKey);
        const labelColor = isDim ? toFg(theme.actionDisabled) : isHighlight ? toFg(theme.actionHighlight) : undefined;
        return (
          <span key={action.key}>
            {i > 0 && <span>  </span>}
            <span dim={isDim} fg={keyColor}>[{action.key}]</span>
            <span dim={isDim} fg={labelColor}> {action.label}</span>
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
  const theme = t();
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
    return <text dim>{proj.root}</text>;
  }
  
  return <text dim>No selection</text>;
}
