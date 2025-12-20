import { useState } from 'react';
import { FolderOpen, X } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import type { WorktreeCandidate } from '@core/types';
import { cn } from '@/lib/utils';

interface AddProjectDialogProps {
  candidates: WorktreeCandidate[];
  onConfirm: (path: string, name: string) => void;
  onCancel: () => void;
  onPickDirectory: () => Promise<string | null>;
}

export function AddProjectDialog({
  candidates,
  onConfirm,
  onCancel,
  onPickDirectory,
}: AddProjectDialogProps) {
  const [selected, setSelected] = useState<WorktreeCandidate | null>(null);
  const [customPath, setCustomPath] = useState<string | null>(null);
  const [name, setName] = useState('');

  const handleSelect = (candidate: WorktreeCandidate) => {
    setSelected(candidate);
    setCustomPath(null);
    setName(candidate.name);
  };

  const handleBrowse = async () => {
    const path = await onPickDirectory();
    if (path) {
      const defaultName = path.split('/').pop() || 'project';
      setCustomPath(path);
      setSelected(null);
      setName(defaultName);
    }
  };

  const handleConfirm = () => {
    const path = customPath || selected?.path;
    if (path && name.trim()) {
      onConfirm(path, name.trim());
    }
  };

  const isValid = (selected || customPath) && name.trim();

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-sm flex flex-col max-h-[80%]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h2 className="text-sm font-medium">Add Project</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X size={16} />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-2">
          {candidates.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">
                Found in Documents:
              </p>
              <div className="space-y-1">
                {candidates.map((c) => (
                  <div
                    key={c.path}
                    className={cn(
                      'px-2 py-1.5 text-sm cursor-pointer transition-colors',
                      'hover:bg-accent/50',
                      selected?.path === c.path && 'bg-accent'
                    )}
                    onClick={() => handleSelect(c)}
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.branchCount} branches
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customPath && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Selected:</p>
              <div className="px-2 py-1.5 bg-accent text-sm">
                {customPath}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full mb-4"
            onClick={handleBrowse}
          >
            <FolderOpen size={14} className="mr-2" />
            Browse...
          </Button>

          {(selected || customPath) && (
            <div>
              <label className="text-xs text-muted-foreground">
                Project Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  'w-full mt-1 px-2 py-1.5 text-sm',
                  'bg-background border border-input',
                  'focus:outline-none focus:ring-1 focus:ring-ring'
                )}
                autoFocus
              />
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 px-3 py-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!isValid}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
