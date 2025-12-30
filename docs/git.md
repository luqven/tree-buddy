# Git Service

The `git` service handles all interactions with the git CLI. Located at `src/services/git.ts`.

## Discovery

| Function | Description |
|----------|-------------|
| `isWorktreeRoot(path)` | Check if path is a worktree root (has `.git` file/dir) |
| `isBareRepo(path)` | Check if path is a bare repository |
| `scanForWorktrees(dir, maxDepth?)` | Recursively scan for worktree projects (sync) |
| `scanForWorktreesAsync(dir, maxDepth?)` | Recursively scan for worktree projects (async) |
| `getRepoRootAsync(path)` | Get the repository root for a worktree path |

## Worktree Listing

| Function | Description |
|----------|-------------|
| `listWorktrees(root)` | List all worktrees for a repository (sync) |
| `listWorktreesAsync(root)` | List all worktrees for a repository (async) |

## Status

| Function | Description |
|----------|-------------|
| `getStatus(path)` | Get ahead/behind counts and dirty flag (sync) |
| `getStatusAsync(path)` | Get ahead/behind counts and dirty flag (async) |
| `refreshStatuses(branches)` | Refresh status for multiple branches (sync) |
| `refreshStatusesAsync(branches)` | Refresh status for multiple branches (async, batched) |
| `hasUncommittedChangesAsync(path)` | Check if worktree has uncommitted changes |

## Branch Information

| Function | Description |
|----------|-------------|
| `getMainBranchAsync(repoRoot)` | Get the main branch name (main or master) |
| `getMergedBranchesAsync(repoRoot, mainBranch)` | List branches merged into main |
| `getCurrentBranchAsync(path)` | Get current branch name for a worktree |
| `fetchRemoteBranchesAsync(repoRoot)` | List remote branches |
| `fetchLocalBranchesAsync(repoRoot)` | List local branches |

## Worktree Operations

| Function | Description |
|----------|-------------|
| `createWorktreeAsync(opts)` | Create a new worktree |
| `removeWorktreeAsync(repoRoot, path, force?)` | Delete a worktree |
| `pruneWorktreesAsync(repoRoot)` | Prune stale worktree references |
| `lockWorktreeAsync(path)` | Lock a worktree to prevent deletion |
| `unlockWorktreeAsync(path)` | Unlock a worktree |

### CreateWorktreeOpts

```typescript
interface CreateWorktreeOpts {
  repoRoot: string;    // Path to bare repo or main worktree
  branchName: string;  // Name for new branch
  baseBranch?: string; // Branch to base off (default: HEAD)
}
```

## Git Operations

| Function | Description |
|----------|-------------|
| `fetchAsync(path)` | Run `git fetch` in worktree |
| `pullAsync(path)` | Run `git pull` in worktree, returns output |

## Failure Tolerance

All functions are designed to be resilient:

- Git command failures return safe defaults (empty arrays, clean status)
- Path existence is verified before operations
- Errors are logged but don't crash the application
