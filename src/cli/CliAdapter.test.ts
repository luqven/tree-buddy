import { describe, it, expect, vi } from 'vitest';
import { createCliAdapter } from './CliAdapter';
import { homedir } from 'os';
import { join } from 'path';

describe('CliAdapter', () => {
  it('creates adapter with all required methods', () => {
    const onQuit = vi.fn();
    const adapter = createCliAdapter(onQuit);

    expect(adapter.openPath).toBeDefined();
    expect(adapter.showItemInFolder).toBeDefined();
    expect(adapter.trashItem).toBeDefined();
    expect(adapter.openTerminal).toBeDefined();
    expect(adapter.getDocumentsPath).toBeDefined();
    expect(adapter.quit).toBeDefined();
  });

  it('calls onQuit callback when quit is called', () => {
    const onQuit = vi.fn();
    const adapter = createCliAdapter(onQuit);

    adapter.quit();

    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it('returns correct documents path', () => {
    const onQuit = vi.fn();
    const adapter = createCliAdapter(onQuit);

    const docsPath = adapter.getDocumentsPath();

    expect(docsPath).toBe(join(homedir(), 'Documents'));
  });

  it('quit can be called multiple times', () => {
    const onQuit = vi.fn();
    const adapter = createCliAdapter(onQuit);

    adapter.quit();
    adapter.quit();
    adapter.quit();

    expect(onQuit).toHaveBeenCalledTimes(3);
  });

  it('quit callback receives no arguments', () => {
    const onQuit = vi.fn();
    const adapter = createCliAdapter(onQuit);

    adapter.quit();

    expect(onQuit).toHaveBeenCalledWith();
  });
});
