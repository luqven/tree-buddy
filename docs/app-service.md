# AppService

The `AppService` class is the main orchestrator for application state. It coordinates between services and provides a unified API for both the CLI and GUI.

## Overview

```typescript
import { AppService, AppState } from './services/AppService';

const service = new AppService(adapter);
service.subscribe((state: AppState) => {
  // React to state changes
});
```

## AppState

```typescript
interface AppState {
  projects: Project[];
  isRefreshing: boolean;
  isBulkOperating: boolean;
  lastRefreshTs: number;
}
```

## Constructor

```typescript
constructor(adapter: PlatformAdapter)
```

Takes a `PlatformAdapter` that provides platform-specific operations.

## Public Methods

### State Management

| Method | Description |
|--------|-------------|
| `subscribe(listener)` | Register a callback for state changes. Returns unsubscribe function. |
| `getState()` | Get current `AppState` snapshot |

### Refresh

| Method | Description |
|--------|-------------|
| `refreshAllThrottled(force?)` | Refresh all projects (throttled to 5s minimum interval) |
| `refreshAll(force?)` | Refresh all projects immediately |
| `refreshProject(id)` | Refresh a single project by ID |

### Project Management

| Method | Description |
|--------|-------------|
| `getCandidates()` | Get list of discoverable worktree projects |
| `confirmAddProject(path, name)` | Add a project to config |
| `removeProject(id)` | Remove a project from config |
| `updateConfig(updates)` | Partially update config |

### Worktree Operations

| Method | Description |
|--------|-------------|
| `createWorktree(opts)` | Create a new worktree |
| `deleteWorktree(root, path, force?, useTrash?)` | Delete a single worktree |
| `deleteWorktrees(items, onProgress?)` | Bulk delete worktrees with progress callback |
| `lockWorktree(path)` | Lock a worktree to prevent deletion |
| `unlockWorktree(path)` | Unlock a worktree |

### Git Operations

| Method | Description |
|--------|-------------|
| `fetchWorktree(path)` | Run `git fetch` in worktree |
| `pullWorktree(path)` | Run `git pull` in worktree |
| `getRemoteBranches(projectId)` | List remote branches for a project |
| `getLocalBranches(projectId)` | List local branches for a project |

### Platform Operations

| Method | Description |
|--------|-------------|
| `openPath(path)` | Open path in default application |
| `showInFolder(path)` | Reveal in Finder |
| `openInTerminal(path)` | Open Terminal at path |
| `quit()` | Quit the application |

### Theme

| Method | Description |
|--------|-------------|
| `setTheme(name)` | Set and persist theme |
| `getPersistedTheme()` | Get saved theme name |
| `setTerminalMode(mode)` | Set and persist terminal mode ('light' \| 'dark') |
| `getPersistedTerminalMode()` | Get saved terminal mode |

## PlatformAdapter Interface

```typescript
interface PlatformAdapter {
  openPath(path: string): void;
  showItemInFolder(path: string): void;
  openTerminal(path: string): void;
  quit(): void;
  moveToTrash?(path: string): Promise<void>;
}
```

Implementations:
- `CliAdapter` - Uses `open` command for macOS
- Electron main process - Uses Electron shell APIs
