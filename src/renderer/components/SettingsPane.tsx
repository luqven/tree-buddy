import { useAppState } from '../hooks/useAppState';
import { cn } from '@/lib/utils';

export function SettingsPane() {
  const { cfg, updateConfig } = useAppState();

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Branch Grouping</h3>

        <label className="flex items-center gap-3 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={cfg.scopeEnabled}
            onChange={(e) => updateConfig({ scopeEnabled: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">Enable scope grouping</span>
        </label>

        <div className={cn(!cfg.scopeEnabled && 'opacity-50')}>
          <label className="text-xs text-muted-foreground">
            Delimiter
          </label>
          <input
            type="text"
            value={cfg.scopeDelim}
            onChange={(e) => updateConfig({ scopeDelim: e.target.value || '/' })}
            disabled={!cfg.scopeEnabled}
            maxLength={1}
            className={cn(
              'w-full mt-1 px-2 py-1.5 text-sm',
              'bg-background border border-input',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:cursor-not-allowed'
            )}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Branches like "feat/login" will be grouped under "feat"
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-medium mb-2">About</h3>
        <p className="text-xs text-muted-foreground">
          Tree Buddy v0.1.0
          <br />
          Manage your git worktrees from the menubar.
        </p>
      </div>
    </div>
  );
}
