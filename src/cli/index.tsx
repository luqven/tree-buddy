import React from 'react';
import { createCliRenderer, CliRenderer } from "@opentui/core";
import { createRoot, Root } from "@opentui/react";
import { spawnSync } from "child_process";
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
      console.log(`Entering ${path}...`);
      const shell = process.env.SHELL || '/bin/zsh';
      spawnSync(shell, [], {
        cwd: path,
        stdio: 'inherit',
        env: process.env,
      });
      process.exit(0);
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
