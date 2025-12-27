import { useState, useMemo } from 'react';
import { CaretRight, Broom, Lock, Pencil, CloudArrowDown } from '@phosphor-icons/react';
import { useAppState } from '../hooks/useAppState';
import { buildTree } from '@services/scope';
import type { Project, Branch, ScopeNode } from '@core/types';
import { fmtAgo, cn } from '@/lib/utils';

interface BranchTreeProps {
  project: Project;
}

export function BranchTree({ project }: BranchTreeProps) {
  const { cfg, openInTerminal } = useAppState();

  const tree = useMemo(() => {
    return buildTree(project.branches, {
      delim: cfg.scopeDelim,
      enabled: cfg.scopeEnabled,
    });
  }, [project.branches, cfg.scopeDelim, cfg.scopeEnabled]);

  return (
    <div className="py-1">
      {tree.map((node, i) => (
        <ScopeNodeItem
          key={node.name + i}
          node={node}
          projectRoot={project.root}
          onOpen={openInTerminal}
        />
      ))}
    </div>
  );
}

interface ScopeNodeItemProps {
  node: ScopeNode;
  projectRoot: string;
  onOpen: (path: string) => void;
}

function ScopeNodeItem({ node, projectRoot, onOpen }: ScopeNodeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const hasBranch = !!node.branch;

  // Leaf node with branch - show as branch item
  if (hasBranch && !hasChildren) {
    return <BranchItem branch={node.branch!} projectRoot={projectRoot} onOpen={onOpen} />;
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
              <BranchItem branch={node.branch!} projectRoot={projectRoot} onOpen={onOpen} />
            )}
            {node.children.map((child, i) => (
              <ScopeNodeItem
                key={child.name + i}
                node={child}
                projectRoot={projectRoot}
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
    return <BranchItem branch={node.branch!} projectRoot={projectRoot} onOpen={onOpen} />;
  }

  return null;
}

interface BranchItemProps {
  branch: Branch;
  projectRoot: string;
  onOpen: (path: string) => void;
}

function BranchItem({ branch, projectRoot, onOpen }: BranchItemProps) {
  const { lockWorktree, unlockWorktree, deletingPaths } = useAppState();
  const [isPending, setIsPending] = useState(false);
  const ago = branch.status.ts ? fmtAgo(branch.status.ts) : 'never';

  const isDeleting = deletingPaths.has(branch.path);
  const isBusy = isPending || isDeleting;

  const toggleLock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPending(true);
    try {
      if (branch.locked) {
        await unlockWorktree(branch.path);
      } else {
        await lockWorktree(branch.path);
      }
    } catch {
      setIsPending(false);
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center p-2 rounded-md hover:bg-accent/50 transition-colors',
        branch.isCurrent && 'font-semibold',
        branch.locked && 'opacity-75',
        isBusy && 'opacity-50 pointer-events-none',
        isDeleting && 'animate-pulse'
      )}
      onClick={() => !isBusy && onOpen(branch.path)}
      title={isBusy ? 'Processing...' : `Open ${branch.name} (${branch.locked ? 'locked' : 'unlocked'})`}
    >
      <span className="flex-1 text-sm truncate">{branch.name}</span>

      <div className="flex items-center gap-1 ml-2 mr-2">
        {/* Behind origin indicator */}
        {branch.status.behind > 0 && (
          <div
            className="inline-flex items-center justify-center w-5 h-5 text-status-red"
            title={`${branch.status.behind} commit${branch.status.behind > 1 ? 's' : ''} behind origin`}
          >
            <CloudArrowDown size={14} />
          </div>
        )}

        {/* Cleanup/Status icons */}
        {branch.showCleanupIcon && (
          branch.isMain || branch.isCurrent || branch.locked ? (
            <div 
              className="inline-flex items-center justify-center w-5 h-5 text-muted-foreground/50"
              title={branch.cleanupIconType === 'pencil' ? "Uncommitted changes" : "Merged"}
            >
              {branch.cleanupIconType === 'pencil' ? <Pencil size={14} /> : <Broom size={14} />}
            </div>
          ) : (
            <button
              className={cn(
                "inline-flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-primary",
                isBusy && "cursor-not-allowed"
              )}
              disabled={isBusy}
              onClick={async (e) => {
                e.stopPropagation();

                const isPencil = branch.cleanupIconType === 'pencil';
                if (isPencil) {
                  // Show confirmation for pencil (uncommitted changes)
                  const confirmed = window.confirm(
                    `This worktree has uncommitted changes. Are you sure you want to delete "${branch.name}"?`
                  );
                  if (!confirmed) return;
                }

                setIsPending(true);
                try {
                  // Use fast "bumblebee" trash approach for individual cleanups too
                  const ok = await window.treeBuddy.deleteWorktree(projectRoot, branch.path, isPencil, true);
                  if (!ok) setIsPending(false);
                } catch {
                  setIsPending(false);
                }
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
          )
        )}

        {/* Lock icon - clickable for all non-main branches */}
        {!branch.isMain && (
          <button
            className={cn(
              "inline-flex items-center justify-center w-5 h-5 transition-colors",
              branch.locked ? "text-primary" : "text-muted-foreground/30 hover:text-primary opacity-0 group-hover:opacity-100",
              isBusy && "cursor-not-allowed"
            )}
            onClick={toggleLock}
            disabled={isBusy}
            title={branch.locked ? "Unlock worktree" : "Lock worktree"}
          >
            <Lock size={14} weight={branch.locked ? "fill" : "regular"} />
          </button>
        )}
      </div>

      <span className="text-xs text-muted-foreground tabular-nums">{ago}</span>
    </div>
  );
}
