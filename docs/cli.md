# CLI

The terminal UI built with OpenTUI and React.

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/luqven/tree-buddy/main/install.sh | bash
```

The installer will:
1. Detect your OS and architecture
2. Download the correct binary
3. Install to `/usr/local/bin` or `~/.local/bin`
4. Print shell function setup instructions

### Manual Installation

Download the binary for your platform from [GitHub Releases](https://github.com/luqven/tree-buddy/releases/latest):

| Platform | Binary |
|----------|--------|
| macOS (Apple Silicon) | `tb-darwin-arm64` |
| macOS (Intel) | `tb-darwin-x64` |
| Linux (x64) | `tb-linux-x64` |
| Linux (ARM64) | `tb-linux-arm64` |

```bash
# Example for macOS Apple Silicon
curl -L https://github.com/luqven/tree-buddy/releases/latest/download/tb-darwin-arm64 -o tb
chmod +x tb
sudo mv tb /usr/local/bin/
```

### Shell Function Setup (Required for cd)

The `tb` binary cannot change your shell's working directory directly. To enable pressing `Enter` to cd into a worktree, add this function to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
tb() {
  command tb "$@"
  local cd_file="/tmp/tree-buddy-cd-path"
  if [[ -f "$cd_file" ]]; then
    local target=$(cat "$cd_file")
    rm -f "$cd_file"
    if [[ -d "$target" ]]; then
      cd "$target"
    fi
  fi
}
```

Then reload your shell:

```bash
source ~/.zshrc  # or ~/.bashrc
```

**Alternative: Subshell mode**

If you don't want to set up the shell function, press `s` instead of `Enter` to open a subshell in the selected worktree. Type `exit` to return.

### Development (Run from Source)

If you have Bun installed:

```bash
git clone https://github.com/luqven/tree-buddy.git
cd tree-buddy
npm install
npm run cli:bun
```

## Usage

```bash
tb              # Launch the TUI
tb --version    # Show version
tb -v           # Show version (short)
```

## Keybindings

### Navigation

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `Enter` | cd into worktree (requires shell function) |
| `s` | Open subshell in worktree |
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
