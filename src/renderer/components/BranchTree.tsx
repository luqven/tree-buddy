import { useState } from 'react';
import { CaretRight } from '@phosphor-icons/react';
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
        'flex items-center gap-2 px-3 py-1 cursor-pointer',
        'hover:bg-accent/50 transition-colors'
      )}
      onClick={() => onOpen(branch.path)}
      title={`Open ${branch.name}`}
    >
      <StatusDot status={status} />
      <span className="flex-1 text-sm truncate">{branch.name}</span>
      <span className="text-xs text-muted-foreground">{ago}</span>
    </div>
  );
}
