import React from 'react';
import { createCliRenderer, CliRenderer } from "@opentui/core";
import { createRoot, Root } from "@opentui/react";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { App } from "./App";
import { AppService } from "../services/AppService";
import { createCliAdapter } from "./CliAdapter";

// VERSION is injected at build time via --define, fallback to 'dev' for development
declare const VERSION: string | undefined;

// Handle --version flag before starting the app
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(`tb ${typeof VERSION !== 'undefined' ? VERSION : 'dev'}`);
  process.exit(0);
}

// Use /tmp directly for compatibility with shell function (not tmpdir() which resolves to /var/folders/... on macOS)
const CD_PATH_FILE = '/tmp/tree-buddy-cd-path';

let renderer: CliRenderer | null = null;
let root: Root | null = null;

function cleanup() {
  if (root) {
    root.unmount();
    root = null;
  }
  if (renderer) {
    renderer.destroy();
    renderer = null;
  }
  // Ensure terminal is back to normal mode
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  // Clear alternate screen buffer and reset cursor
  process.stdout.write('\x1b[?1049l\x1b[?25h');
}

// Clean up any stale cd path file on startup
if (existsSync(CD_PATH_FILE)) {
  try { unlinkSync(CD_PATH_FILE); } catch {}
}

async function main() {
  renderer = await createCliRenderer({
    exitOnCtrlC: false, // We'll handle it ourselves
  });
  
  const adapter = createCliAdapter({
    onQuit: () => {
      cleanup();
      process.exit(0);
    },
    onCdQuit: (path: string) => {
      cleanup();
      // Write path to temp file for shell function to read
      writeFileSync(CD_PATH_FILE, path);
      process.exit(0);
    },
    onSubshell: (path: string) => {
      cleanup();
      console.log(`Opening subshell in ${path}...`);
      console.log('Type "exit" to return.\n');
      const shell = process.env.SHELL || '/bin/zsh';
      const child = spawn(shell, ['-i'], {
        cwd: path,
        stdio: 'inherit',
        detached: true,
      });
      // Transfer control to child
      child.on('exit', (code) => {
        process.exit(code ?? 0);
      });
      // Unref so parent doesn't wait
      child.unref();
    },
  });
  
  const service = new AppService(adapter as any);
  
  root = createRoot(renderer);
  root.render(<App service={service} adapter={adapter} />);
}

main().catch((err) => {
  cleanup();
  console.error(err);
  process.exit(1);
});
