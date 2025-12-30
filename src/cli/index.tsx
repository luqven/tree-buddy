import React from 'react';
import { createCliRenderer, CliRenderer } from "@opentui/core";
import { createRoot, Root } from "@opentui/react";
import { App } from "./App";
import { AppService } from "../services/AppService";
import { createCliAdapter, CliPlatformAdapter } from "./CliAdapter";

let renderer: CliRenderer | null = null;
let root: Root | null = null;
let cdPath: string | null = null;

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
      cdPath = path;
      cleanup();
      // Output path for shell wrapper to cd into
      console.log(path);
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
