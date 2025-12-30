# Architecture

## Directory Structure

```
src/
├── cli/              # Terminal UI (OpenTUI/React)
│   ├── App.tsx       # Main TUI component
│   ├── CliAdapter.ts # Platform adapter for CLI
│   ├── theme.ts      # Color themes and terminal mode detection
│   └── index.tsx     # CLI entry point
├── core/
│   └── types.ts      # Domain models: Project, Branch, GitStatus, Config
├── services/
│   ├── AppService.ts # State management and orchestration
│   ├── git.ts        # Git CLI operations
│   ├── store.ts      # Config persistence
│   ├── cache.ts      # Scan cache management
│   └── scope.ts      # Branch name parsing and tree building
├── main/
│   ├── index.ts      # Electron app entry point
│   ├── ipc.ts        # IPC handlers
│   └── preload.ts    # Preload script for renderer
├── renderer/         # Electron GUI components
└── index.ts          # Public API exports
```

## Data Flow

### Startup

```
[Startup]
    │
    ├─► Load config from disk
    ├─► Show cached menu immediately
    └─► Async refresh all statuses
            │
            └─► Update menu when done
```

### Background Refresh

```
[Background]
    │
    └─► setInterval(5min) ─► Refresh all statuses ─► Update menu
```

### Add Project

```
[Add Project]
    │
    ├─► Load scan cache (or scan if stale)
    ├─► Show discovery dialog
    └─► Add to config ─► Refresh statuses
```

## Technology Choices

### Electron

Used for the menubar GUI. Provides native macOS integration, tray icon support, and access to system APIs (Finder, Terminal).

### OpenTUI + React

The CLI uses [OpenTUI](https://github.com/sst/opentui), a terminal UI framework with a React renderer. This enables:

- Declarative UI with React components
- Familiar patterns (hooks, state, props)
- Native terminal rendering via Zig for performance

### Bun

The CLI runs via Bun (`npm run cli:bun`) instead of Node/tsx for faster startup time. Bun's native TypeScript support eliminates transpilation overhead.

### Pure Functions for Services

All services (`git.ts`, `store.ts`, `cache.ts`, `scope.ts`) are implemented as pure functions rather than classes:

- **Testability**: No mocking of class instances needed
- **No side effects**: Functions take input and return output
- **Composability**: Easy to combine and reuse

### AppService Class

The single exception is `AppService`, which manages application state and coordinates between services. It uses:

- **Observer pattern**: Components subscribe to state changes
- **Adapter pattern**: `PlatformAdapter` interface abstracts platform-specific operations (open Finder, quit app, etc.)
