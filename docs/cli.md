# CLI

The terminal UI built with OpenTUI and React.

## Keybindings

### Navigation

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `Enter` | cd into selected worktree |
| `q` | Quit |
| `/` | Command palette |
| `?` | Help |

### Worktree Operations

| Key | Action |
|-----|--------|
| `n` | Create new worktree |
| `d` | Delete worktree |
| `D` | Delete all merged worktrees |
| `l` | Toggle lock |

### Git Operations

| Key | Action |
|-----|--------|
| `f` | Fetch |
| `p` | Pull |
| `r` | Refresh all |

### Project Management

| Key | Action |
|-----|--------|
| `a` | Add project |
| `x` | Remove project |
| `o` | Open in Finder |
| `t` | Open in Terminal |

## Themes

Press `/` and select "Change theme..." to switch between:

- **solarized** (default)
- **dracula**
- **nord**
- **monokai**

Each theme supports both light and dark terminal backgrounds.

## Light/Dark Mode

The CLI auto-detects your terminal color scheme using environment variables (`COLORTERM`, `COLORFGBG`, `TERM_PROGRAM`).

If colors appear incorrect, press `/` and select "Switch to light mode" or "Switch to dark mode". The setting is persisted to your config.

## Quick Access

Add a shell alias for quick access:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias tb="bun ~/path/to/tree-buddy/src/cli/index.tsx"
```

Then run `tb` from anywhere to launch the CLI.
