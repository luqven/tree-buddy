# Tree Buddy

Git worktree manager for macOS — available as a menubar app or CLI.

## Features

- **Project discovery** - Scans `~/Documents` for worktree projects
- **Branch scoping** - Groups branches by path segments (e.g., `l/ENG-123/feat` → `l` → `ENG-123` → `feat`)
- **Status indicators** - Green (clean), yellow (uncommitted), red (behind upstream)
- **Branch protection** - Lock branches to prevent accidental deletion
- **Background refresh** - Auto-updates every 5 minutes
- **Cached startup** - Shows cached data instantly, refreshes in background

## CLI

Run the terminal UI:

```bash
npm run cli:bun
```

### Keybindings

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `q` | Quit |
| `/` | Command palette |
| `?` | Help |

#### Worktree

| Key | Action |
|-----|--------|
| `n` | Create new worktree |
| `d` | Delete worktree |
| `D` | Delete all merged |
| `l` | Toggle lock |

#### Git

| Key | Action |
|-----|--------|
| `f` | Fetch |
| `p` | Pull |
| `r` | Refresh all |

#### Projects

| Key | Action |
|-----|--------|
| `a` | Add project |
| `x` | Remove project |
| `o` | Open in Finder |
| `t` | Open in Terminal |

### Themes

Press `/` then select "Change theme..." to switch between:
- solarized (default)
- dracula
- nord
- monokai

### Light/Dark Mode

The CLI auto-detects your terminal color scheme. If colors look wrong, press `/` and select "Switch to light/dark mode".

## GUI

Run the Electron menubar app:

```bash
npm start
```

## Development

```bash
npm install
npm run build    # Compile TypeScript
npm test         # Run tests
```

## Architecture

```
src/
├── cli/              # Terminal UI (OpenTUI/React)
├── core/             # Domain types
├── services/         # Git, store, cache
├── main/             # Electron entry
└── renderer/         # GUI components
```

### Storage

| Path | Contents |
|------|----------|
| `~/.config/tree-buddy/config.json` | Projects, theme, settings |
| `~/.cache/tree-buddy/scan.json` | Cached discovery results |
