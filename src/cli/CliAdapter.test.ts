import { describe, it, expect, vi } from 'vitest';
import { createCliAdapter } from './CliAdapter';
import { homedir } from 'os';
import { join } from 'path';

describe('CliAdapter', () => {
  const createOpts = () => ({
    onQuit: vi.fn(),
    onCdQuit: vi.fn(),
  });

  it('creates adapter with all required methods', () => {
    const opts = createOpts();
    const adapter = createCliAdapter(opts);

    expect(adapter.openPath).toBeDefined();
    expect(adapter.showItemInFolder).toBeDefined();
    expect(adapter.trashItem).toBeDefined();
    expect(adapter.openTerminal).toBeDefined();
    expect(adapter.getDocumentsPath).toBeDefined();
    expect(adapter.quit).toBeDefined();
    expect(adapter.cdAndQuit).toBeDefined();
  });

  it('calls onQuit callback when quit is called', () => {
    const opts = createOpts();
    const adapter = createCliAdapter(opts);

    adapter.quit();

    expect(opts.onQuit).toHaveBeenCalledTimes(1);
  });

  it('returns correct documents path', () => {
    const opts = createOpts();
    const adapter = createCliAdapter(opts);

    const docsPath = adapter.getDocumentsPath();

    expect(docsPath).toBe(join(homedir(), 'Documents'));
  });

  it('quit can be called multiple times', () => {
    const opts = createOpts();
    const adapter = createCliAdapter(opts);

    adapter.quit();
    adapter.quit();
    adapter.quit();

    expect(opts.onQuit).toHaveBeenCalledTimes(3);
  });

  it('quit callback receives no arguments', () => {
    const opts = createOpts();
    const adapter = createCliAdapter(opts);

    adapter.quit();

    expect(opts.onQuit).toHaveBeenCalledWith();
  });

  it('calls onCdQuit with path when cdAndQuit is called', () => {
    const opts = createOpts();
    const adapter = createCliAdapter(opts);

    adapter.cdAndQuit('/some/path');

    expect(opts.onCdQuit).toHaveBeenCalledWith('/some/path');
  });
});
