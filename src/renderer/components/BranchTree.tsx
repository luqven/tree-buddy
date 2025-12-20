import { useState } from 'react';
import { CaretRight, Broom, Lock, Pencil } from '@phosphor-icons/react';
import { StatusDot } from './StatusDot';
import { useAppState } from '../hooks/useAppState';
import { buildTree } from '@services/scope';
import type { Project, Branch, ScopeNode } from '@core/types';
import { toSyncStatus } from '@core/types';
import { fmtAgo, cn } from '@/lib/utils';

interface BranchTreeProps {
  project: Project;
}

export function BranchTree({ project }: BranchTreeProps) {
  const { cfg, openPath } = useAppState();

  const tree = buildTree(project.branches, {
    delim: cfg.scopeDelim,
    enabled: cfg.scopeEnabled,
  });

  return (
    <div className="py-1">
      {tree.map((node, i) => (
        <ScopeNodeItem
          key={node.name + i}
          node={node}
          onOpen={openPath}
        />
      ))}
    </div>
  );
}

interface ScopeNodeItemProps {
  node: ScopeNode;
  onOpen: (path: string) => void;
}

function ScopeNodeItem({ node, onOpen }: ScopeNodeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const hasBranch = !!node.branch;

  // Leaf node with branch - show as branch item
  if (hasBranch && !hasChildren) {
    return <BranchItem branch={node.branch!} onOpen={onOpen} />;
  }

  // Scope folder with children
  if (hasChildren) {
    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1 cursor-pointer',
            'hover:bg-accent/50 transition-colors'
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <CaretRight
            size={12}
            className={cn(
              'text-muted-foreground transition-transform',
              expanded && 'rotate-90'
            )}
          />
          <span className="text-sm text-muted-foreground">{node.name}</span>
        </div>

        {expanded && (
          <div className="ml-3 border-l border-border">
            {/* If scope itself is also a branch, show it first */}
            {hasBranch && (
              <BranchItem branch={node.branch!} onOpen={onOpen} />
            )}
            {node.children.map((child, i) => (
              <ScopeNodeItem
                key={child.name + i}
                node={child}
                onOpen={onOpen}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Branch without children
  if (hasBranch) {
    return <BranchItem branch={node.branch!} onOpen={onOpen} />;
  }

  return null;
}

interface BranchItemProps {
  branch: Branch;
  onOpen: (path: string) => void;
}

function BranchItem({ branch, onOpen }: BranchItemProps) {
  const status = toSyncStatus(branch.status);
  const ago = branch.status.ts ? fmtAgo(branch.status.ts) : 'never';

  return (
    <div
      className={cn(
        'flex items-center p-2 rounded-md hover:bg-accent/50 transition-colors',
        branch.isCurrent && 'font-semibold',
        branch.locked && 'opacity-75'
      )}
      onClick={() => onOpen(branch.path)}
      onContextMenu={(e) => {
        e.preventDefault();
        // Simple context menu - could be enhanced with a proper menu component
        const action = branch.locked ? 'unlock' : 'lock';
        const confirmed = window.confirm(`Do you want to ${action} this worktree?`);
        if (confirmed) {
          if (action === 'lock') {
            window.treeBuddy.lockWorktree(branch.path);
          } else {
            window.treeBuddy.unlockWorktree(branch.path);
          }
        }
      }}
      title={`Open ${branch.name} (${branch.locked ? 'locked' : 'unlocked'})`}
    >
      <StatusDot status={status} />
      <span className="flex-1 text-sm truncate">{branch.name}</span>

    {/* Lock icon - always shown for locked branches */}
    {branch.locked && (
      <Lock size={14} className="ml-2 text-muted-foreground" title="Locked worktree" />
    )}

    {/* Cleanup icons - only for merged + unlocked + not current */}
    {branch.showCleanupIcon && (
      <button
        className="ml-2 inline-flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-primary"
        onClick={(e) => {
          e.stopPropagation();

          const isPencil = branch.cleanupIconType === 'pencil';
          if (isPencil) {
            // Show confirmation for pencil (uncommitted changes)
            const confirmed = window.confirm(
              `This worktree has uncommitted changes. Are you sure you want to delete "${branch.name}"?`
            );
            if (!confirmed) return;
          }

          window.treeBuddy.deleteWorktree(branch.path);
        }}
        title={branch.cleanupIconType === 'pencil'
          ? "Delete merged worktree (has uncommitted changes)"
          : "Delete merged worktree"
        }
      >
        {branch.cleanupIconType === 'pencil' ? (
          <Pencil size={14} />
        ) : (
          <Broom size={14} />
        )}
      </button>
    )}

    {/* Spacer when no cleanup icon */}
    {!branch.locked && !branch.showCleanupIcon && (
      <span className="ml-2 w-5" aria-label="action-slot" />
    )}

    <span className="text-xs text-muted-foreground">{ago}</span>
  </div>
  );
}
