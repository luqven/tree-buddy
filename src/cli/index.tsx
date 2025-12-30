import React from 'react';
import { createCliRenderer, CliRenderer } from "@opentui/core";
import { createRoot, Root } from "@opentui/react";
import { spawn } from "child_process";
import { App } from "./App";
import { AppService } from "../services/AppService";
import { createCliAdapter } from "./CliAdapter";

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
      // Output path for shell alias to capture: alias tb='cd "$(tree-buddy)"'
      console.log(path);
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
