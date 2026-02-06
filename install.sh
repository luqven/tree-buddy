#!/bin/bash
set -e

VERSION="${VERSION:-v0.4.0}"
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      arm64) ARTIFACT="tb-darwin-arm64" ;;
      x86_64) ARTIFACT="tb-darwin-x64" ;;
      *) echo "Unsupported architecture: $ARCH" && exit 1 ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64) ARTIFACT="tb-linux-x64" ;;
      aarch64|arm64) ARTIFACT="tb-linux-arm64" ;;
      *) echo "Unsupported architecture: $ARCH" && exit 1 ;;
    esac
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

URL="https://github.com/luqven/tree-buddy/releases/download/${VERSION}/${ARTIFACT}"
INSTALL_DIR="${HOME}/.local/bin"
BIN_PATH="${INSTALL_DIR}/tb"

echo "Installing tree-buddy ${VERSION} for ${OS}/${ARCH}..."
echo "Downloading from ${URL}..."

mkdir -p "${INSTALL_DIR}"
curl -fsSL -o "${BIN_PATH}" "${URL}"
chmod +x "${BIN_PATH}"

echo ""
echo "Installed to: ${BIN_PATH}"
echo ""
echo "Add to PATH by adding this to your shell profile (.bashrc, .zshrc, etc):"
echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
echo ""
echo "Or run directly: ${BIN_PATH}"
