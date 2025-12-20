# Tree Buddy

macOS menubar app for managing git worktrees.

## Features

- **Project discovery** - Scans `~/Documents` for worktree projects
- **Branch scoping** - Groups branches by path segments (e.g., `l/ENG-123/feat` → `l` → `ENG-123` → `feat`)
- **Status indicators** - Stoplight colors: green (clean), yellow (uncommitted), red (behind upstream)
- **Branch protection** - Lock branches to prevent accidental cleanup/deletion
- **Background refresh** - Auto-updates every 5 minutes
- **Cached startup** - Shows cached data instantly, refreshes in background

## Architecture

```
src/
├── core/
│   └── types.ts          # Domain models: Project, Branch, GitStatus, ScopeNode
├── services/
│   ├── git.ts            # Git operations (sync + async versions)
│   ├── scope.ts          # Branch name parsing and tree building
│   ├── store.ts          # Config persistence (~/.config/tree-buddy/)
│   └── cache.ts          # Scan cache (~/.cache/tree-buddy/)
├── ui/
│   ├── menu.ts           # Native menu builder
│   └── icons.ts          # Programmatic status icon generation
├── main/
│   └── index.ts          # Electron app entry point
└── index.ts              # Public API exports
```

### Data Flow

```
[Startup]
    │
    ├─► Load config from disk
    ├─► Show cached menu immediately
    └─► Async refresh all statuses
            │
            └─► Update menu when done

[Background]
    │
    └─► setInterval(5min) ─► Refresh all statuses ─► Update menu

[Add Project]
    │
    ├─► Load scan cache (or scan if stale)
    ├─► Show discovery dialog
    └─► Add to config ─► Refresh statuses
```

### Key Types

| Type | Purpose |
|------|---------|
| `Project` | Worktree root with name, path, branches |
| `Branch` | Single worktree with name, path, status |
| `GitStatus` | ahead/behind counts, dirty flag, timestamp |
| `ScopeNode` | Tree node for nested branch display |
| `SyncStatus` | `'green'` \| `'yellow'` \| `'red'` |

### Storage

| Path | Contents |
|------|----------|
| `~/.config/tree-buddy/config.json` | Projects, scope settings |
| `~/.cache/tree-buddy/scan.json` | Cached worktree discovery results |

## Development

```bash
npm install
npm run build    # Compile TypeScript
npm start        # Build + run app
npm test         # Run tests
```

## Tech Stack

- **Electron** - Desktop app framework
- **TypeScript** - Type safety
- **Vitest** - Unit testing
- **menubar** - Tray integration (dependency)
