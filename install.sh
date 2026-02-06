#!/bin/bash
set -e

# Tree Buddy CLI installer
# Usage: curl -fsSL https://raw.githubusercontent.com/luqven/tree-buddy/main/install.sh | bash
# Non-interactive: curl -fsSL ... | bash -s -- -y

REPO="luqven/tree-buddy"
BINARY_NAME="tb"
INSTALL_WT_ALIAS=false
NON_INTERACTIVE=false

# Parse command line arguments
for arg in "$@"; do
  case "$arg" in
    -y|--yes)
      NON_INTERACTIVE=true
      ;;
  esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}$1${NC}"; }
success() { echo -e "${GREEN}$1${NC}"; }
warn() { echo -e "${YELLOW}$1${NC}"; }
error() { echo -e "${RED}$1${NC}"; exit 1; }

# Detect OS and architecture
detect_platform() {
  OS=$(uname -s)
  ARCH=$(uname -m)

  case "$OS" in
    Darwin)
      case "$ARCH" in
        arm64) PLATFORM="darwin-arm64" ;;
        x86_64) PLATFORM="darwin-x64" ;;
        *) error "Unsupported architecture: $ARCH" ;;
      esac
      ;;
    Linux)
      case "$ARCH" in
        x86_64) PLATFORM="linux-x64" ;;
        *) error "Unsupported Linux architecture: $ARCH (only x64 supported)" ;;
      esac
      ;;
    *)
      error "Unsupported operating system: $OS"
      ;;
  esac

  info "Detected platform: $PLATFORM"
}

# Get latest release version
get_latest_version() {
  VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
  if [ -z "$VERSION" ]; then
    error "Failed to fetch latest version"
  fi
  info "Latest version: $VERSION"
}

# Choose install location
choose_install_dir() {
  if [ "$NON_INTERACTIVE" = true ]; then
    INSTALL_DIR="/usr/local/bin"
    NEEDS_SUDO=true
    info "Install directory: $INSTALL_DIR"
    return
  fi

  echo ""
  info "Where would you like to install $BINARY_NAME?"
  echo "  1) /usr/local/bin (requires sudo)"
  echo "  2) ~/.local/bin (no sudo required)"
  echo ""
  read -p "Choose [1/2] (default: 1): " choice

  case "$choice" in
    2)
      INSTALL_DIR="$HOME/.local/bin"
      NEEDS_SUDO=false
      mkdir -p "$INSTALL_DIR"
      ;;
    *)
      INSTALL_DIR="/usr/local/bin"
      NEEDS_SUDO=true
      ;;
  esac

  info "Install directory: $INSTALL_DIR"
}

# Ask about wt alias
ask_wt_alias() {
  if [ "$NON_INTERACTIVE" = true ]; then
    INSTALL_WT_ALIAS=true
    return
  fi

  echo ""
  read -p "Would you like to also install 'wt' as an alias for 'tb'? [Y/n]: " choice
  case "$choice" in
    n|N)
      INSTALL_WT_ALIAS=false
      ;;
    *)
      INSTALL_WT_ALIAS=true
      ;;
  esac
}

# Download and install binary
install_binary() {
  DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/$BINARY_NAME-$PLATFORM"
  TMP_FILE=$(mktemp)

  info "Downloading $BINARY_NAME from $DOWNLOAD_URL..."
  curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE" || error "Failed to download binary"

  chmod +x "$TMP_FILE"

  if [ "$NEEDS_SUDO" = true ]; then
    info "Installing to $INSTALL_DIR (requires sudo)..."
    sudo mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"
  else
    mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"
  fi

  success "Installed $BINARY_NAME to $INSTALL_DIR/$BINARY_NAME"

  # Install wt symlink if requested
  if [ "$INSTALL_WT_ALIAS" = true ]; then
    if [ "$NEEDS_SUDO" = true ]; then
      sudo ln -sf "$INSTALL_DIR/$BINARY_NAME" "$INSTALL_DIR/wt"
    else
      ln -sf "$INSTALL_DIR/$BINARY_NAME" "$INSTALL_DIR/wt"
    fi
    success "Installed 'wt' alias -> $INSTALL_DIR/wt"
  fi
}

# Check if install dir is in PATH
check_path() {
  if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    warn "Note: $INSTALL_DIR is not in your PATH"
    echo ""
    echo "Add this to your shell config (~/.zshrc or ~/.bashrc):"
    echo ""
    echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
    echo ""
  fi
}

# Print shell function setup instructions
print_shell_setup() {
  echo ""
  success "Installation complete!"
  echo ""
  echo "To verify installation:"
  echo "  $BINARY_NAME --version"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  warn "IMPORTANT: Shell function setup required for 'cd' functionality"
  echo ""
  echo "The 'tb' binary cannot change your shell's directory directly."
  echo "To enable pressing Enter to cd into a worktree, add this function"
  echo "to your shell config (~/.zshrc or ~/.bashrc):"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cat << 'EOF'

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
EOF

  if [ "$INSTALL_WT_ALIAS" = true ]; then
    cat << 'EOF'

wt() {
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
EOF
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "After adding the function, reload your shell:"
  echo "  source ~/.zshrc  # or ~/.bashrc"
  echo ""
  echo "Alternatively, press 's' in tb to open a subshell (no setup required)."
  echo ""
}

# Main
main() {
  echo ""
  info "Tree Buddy CLI Installer"
  echo ""

  detect_platform
  get_latest_version
  choose_install_dir
  ask_wt_alias
  install_binary
  check_path
  print_shell_setup
}

main
