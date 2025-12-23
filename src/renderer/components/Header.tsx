import { Gear, ArrowsClockwise, Plus, Power, Broom } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { useAppState } from '../hooks/useAppState';

type View = 'projects' | 'settings';

interface HeaderProps {
  view: View;
  onViewChange: (view: View) => void;
}

export function Header({ view, onViewChange }: HeaderProps) {
  const { isRefreshing, projects, refreshAll, addProject, cleanupAllMerged, quit } = useAppState();

  const handleAdd = async () => {
    await addProject();
  };

  const mergedCount = projects.reduce((acc, p) => {
    return acc + p.branches.filter(br => br.cleanupIconType === 'broom').length;
  }, 0);

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-border">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAdd}
          title="Add Project"
        >
          <Plus size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={cleanupAllMerged}
          disabled={mergedCount === 0 || isRefreshing}
          title={mergedCount > 0 ? `Cleanup ${mergedCount} merged worktrees` : "No merged worktrees to cleanup"}
        >
          <Broom size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={refreshAll}
          disabled={isRefreshing}
          title="Refresh All"
        >
          <ArrowsClockwise
            size={16}
            className={isRefreshing ? 'animate-spin' : ''}
          />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant={view === 'settings' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => onViewChange(view === 'settings' ? 'projects' : 'settings')}
          title="Settings"
        >
          <Gear size={16} />
        </Button>
      </div>
    </header>
  );
}
