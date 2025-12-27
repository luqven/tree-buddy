import React from 'react';
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App";
import { AppService } from "../services/AppService";
import { cliAdapter } from "./CliAdapter";

async function main() {
  const service = new AppService(cliAdapter);
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
  });
  
  const root = createRoot(renderer);
  root.render(<App service={service} />);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
