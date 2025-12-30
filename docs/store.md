# Store Service

The `store` service manages application configuration and project persistence. Located at `src/services/store.ts`.

## Paths

| Function | Description |
|----------|-------------|
| `getCfgPath(home?)` | Get path to config file (`~/.config/tree-buddy/config.json`) |

## Config Operations

| Function | Description |
|----------|-------------|
| `load(home?)` | Load config from disk. Returns default config if missing/invalid. |
| `save(cfg, home?)` | Persist config to disk |

## Project Management

| Function | Description |
|----------|-------------|
| `addProject(cfg, opts)` | Add a new project to config |
| `rmProject(cfg, id)` | Remove a project by ID |
| `updateProject(cfg, proj)` | Update an existing project |
| `getProject(cfg, id)` | Get a project by ID |
| `hasProject(cfg, path)` | Check if a project path is already tracked |

### AddProjectOpts

```typescript
interface AddProjectOpts {
  path: string;   // Absolute path to worktree root
  name?: string;  // Display name (defaults to directory name)
}
```

## Scope Settings

| Function | Description |
|----------|-------------|
| `setScope(cfg, enabled, delim?)` | Enable/disable branch scoping and set delimiter |

## Theme Settings

| Function | Description |
|----------|-------------|
| `setThemeCfg(cfg, theme)` | Set the theme name |
| `setTerminalModeCfg(cfg, mode)` | Set terminal mode ('light' \| 'dark') |

## Resilience

- `load()` returns `defaultConfig()` if the config file is missing or contains invalid JSON
- `addProject()` returns an entry with empty branches if git scan fails
