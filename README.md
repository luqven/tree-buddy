# Tree Buddy

Git worktree manager for macOS and Linux. Visualize, create, and manage worktrees from your terminal.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/luqven/tree-buddy/main/install.sh | bash
```

See [CLI documentation](docs/cli.md) for manual installation and shell setup.

## Usage

```bash
tb              # Launch the TUI
tb --version    # Show version
```

Navigate with `j`/`k`, quit with `q`, open command palette with `/`, help with `?`.

## Requirements

- macOS (Apple Silicon or Intel) or Linux (x64 or ARM64)

## Development

### From Source

```bash
# Clone and install dependencies
git clone https://github.com/luqven/tree-buddy.git
cd tree-buddy
npm install

# Run CLI directly with Bun
npm run cli:bun

# Run tests
npm test

# Build standalone executable
npm run build:cli
```

### GUI (Menubar App - macOS only)

```bash
npm start
```

## Documentation

See [docs/](docs/) for detailed documentation.
