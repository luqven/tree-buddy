# Storage

Tree Buddy stores configuration and cache data in standard XDG directories.

## Paths

| Path | Purpose |
|------|---------|
| `~/.config/tree-buddy/config.json` | User configuration and project list |
| `~/.cache/tree-buddy/scan.json` | Cached worktree discovery results |

## Config Schema

`~/.config/tree-buddy/config.json`

```json
{
  "scopeDelim": "/",
  "scopeEnabled": true,
  "theme": "solarized",
  "terminalMode": "dark",
  "projects": [
    {
      "id": "abc123",
      "name": "my-project",
      "root": "/Users/me/Documents/my-project",
      "branches": [
        {
          "name": "main",
          "path": "/Users/me/Documents/my-project/main",
          "isMain": true,
          "locked": false,
          "merged": false,
          "prunable": false,
          "status": {
            "ahead": 0,
            "behind": 0,
            "dirty": false,
            "timestamp": 1703894400000
          }
        }
      ]
    }
  ]
}
```

### Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `scopeDelim` | `string` | Delimiter for branch name scoping (default: `/`) |
| `scopeEnabled` | `boolean` | Enable hierarchical branch grouping |
| `theme` | `string` | CLI theme name: `solarized`, `dracula`, `nord`, `monokai` |
| `terminalMode` | `'light' \| 'dark'` | Terminal color scheme override |
| `projects` | `Project[]` | List of tracked worktree projects |

### Project Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `root` | `string` | Absolute path to bare repo or main worktree |
| `branches` | `Branch[]` | List of worktrees |

### Branch Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Branch/worktree name |
| `path` | `string` | Absolute path to worktree directory |
| `isMain` | `boolean` | Is this the main branch |
| `locked` | `boolean` | Protected from deletion |
| `merged` | `boolean` | Has been merged into main |
| `prunable` | `boolean` | Worktree directory is missing |
| `status` | `GitStatus` | Sync status |

### GitStatus Fields

| Field | Type | Description |
|-------|------|-------------|
| `ahead` | `number` | Commits ahead of upstream |
| `behind` | `number` | Commits behind upstream |
| `dirty` | `boolean` | Has uncommitted changes |
| `timestamp` | `number` | Last refresh time (ms since epoch) |

## Scan Cache Schema

`~/.cache/tree-buddy/scan.json`

```json
{
  "timestamp": 1703894400000,
  "candidates": [
    {
      "path": "/Users/me/Documents/my-project",
      "name": "my-project",
      "branchCount": 5
    }
  ]
}
```

### ScanCache Fields

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `number` | When the scan was performed (ms since epoch) |
| `candidates` | `WorktreeCandidate[]` | Discovered worktree projects |

### WorktreeCandidate Fields

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Absolute path to worktree root |
| `name` | `string` | Directory name |
| `branchCount` | `number` | Number of worktrees found |
