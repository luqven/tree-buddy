import { useState } from 'react';
import { CaretRight, FolderOpen, Trash, Warning } from '@phosphor-icons/react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { BranchTree } from './BranchTree';
import { AddProjectDialog } from './AddProjectDialog';
import { useAppState } from '../hooks/useAppState';
import type { Project } from '@core/types';
import { cn } from '@/lib/utils';

export function ProjectList() {
  const {
    projects,
    isRefreshing,
    showAddDialog,
    candidates,
    confirmAddProject,
    cancelAddProject,
    pickDirectory,
    removeProject,
    showInFolder,
  } = useAppState();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <ScrollArea className="h-full">
        <div className="py-1">
          {projects.length === 0 ? (
            <div className="px-3 py-8 text-center text-muted-foreground text-sm">
              No projects yet.
              <br />
              Click + to add one.
            </div>
          ) : (
            projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isRefreshing={isRefreshing}
                isExpanded={expanded[project.id] ?? false}
                onToggle={() => toggleExpanded(project.id)}
                onRemove={() => removeProject(project.id)}
                onShowInFolder={() => showInFolder(project.root)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {showAddDialog && (
        <AddProjectDialog
          candidates={candidates}
          onConfirm={confirmAddProject}
          onCancel={cancelAddProject}
          onPickDirectory={pickDirectory}
        />
      )}
    </>
  );
}

interface ProjectItemProps {
  project: Project;
  isRefreshing: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onShowInFolder: () => void;
}

function ProjectItem({
  project,
  isRefreshing,
  isExpanded,
  onToggle,
  onRemove,
  onShowInFolder,
}: ProjectItemProps) {
  const isError = project.status === 'error';
  const isLoading = isRefreshing && project.status === 'refreshing';

  return (
    <div className="group">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 cursor-pointer',
          'hover:bg-accent/50 transition-colors'
        )}
        onClick={onToggle}
      >
        <CaretRight
          size={14}
          className={cn(
            'text-muted-foreground transition-transform',
            isExpanded && 'rotate-90'
          )}
        />
        {isError && <Warning size={14} className="text-status-red" />}
        <span className="flex-1 text-sm truncate">
          {project.name}
          {isLoading && <span className="ml-1 text-muted-foreground">...</span>}
        </span>
        <div className="hidden group-hover:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onShowInFolder();
            }}
            title="Open in Finder"
          >
            <FolderOpen size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove Project"
          >
            <Trash size={14} />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-4 border-l border-border">
          <BranchTree project={project} />
        </div>
      )}
    </div>
  );
}
