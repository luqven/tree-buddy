# Git Service

The `git` service handles all interactions with the git CLI. It is responsible for discovering worktrees, checking branch status, and managing worktree locks.

## Key Functions

- `listWorktreesAsync(root)`: Lists all worktrees for a given repository.
- `getStatusAsync(path)`: Returns ahead/behind counts and dirty status for a worktree.
- `refreshStatusesAsync(branches)`: Refreshes status for multiple branches. Processes in batches (default: 5) to limit concurrent git processes.
- `scanForWorktreesAsync(dir)`: Recursively scans a directory for git worktree roots.
- `lockWorktreeAsync(path)`: Prevents a worktree from being deleted.
- `unlockWorktreeAsync(path)`: Allows a worktree to be deleted.
- `removeWorktreeAsync(root, path)`: Deletes a git worktree.
