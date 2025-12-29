/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { App } from './App';
import { AppService } from '../services/AppService';
import { PlatformAdapter } from '../core/types';

// Store keyboard callback so we can trigger it in tests
let keyboardCallback: ((event: any) => void) | null = null;

// Mock OpenTUI hooks
vi.mock('@opentui/react', () => ({
  useKeyboard: vi.fn((cb: (event: any) => void) => {
    keyboardCallback = cb;
  }),
  useTerminalDimensions: vi.fn().mockReturnValue({ width: 80, height: 24 }),
}));

describe('App TUI component', () => {
  let service: AppService;
  let adapter: PlatformAdapter;

  beforeEach(() => {
    keyboardCallback = null;
    adapter = {
      openPath: vi.fn(),
      showItemInFolder: vi.fn(),
      trashItem: vi.fn(),
      openTerminal: vi.fn(),
      getDocumentsPath: vi.fn().mockReturnValue('/docs'),
      quit: vi.fn(),
    };
    service = new AppService(adapter);
  });

  it('renders without crashing', () => {
    expect(App).toBeDefined();
  });

  it('triggers refresh on mount', () => {
    const refreshSpy = vi.spyOn(service, 'refreshAllThrottled');
    render(<App service={service} />);
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('subscribes to service on mount', () => {
    const subscribeSpy = vi.spyOn(service, 'subscribe');
    render(<App service={service} />);
    expect(subscribeSpy).toHaveBeenCalled();
  });

  describe('keyboard handling', () => {
    it('calls quit when q is pressed', () => {
      const quitSpy = vi.spyOn(service, 'quit');
      render(<App service={service} />);
      
      expect(keyboardCallback).not.toBeNull();
      keyboardCallback!({ name: 'q' });
      
      expect(quitSpy).toHaveBeenCalled();
    });

    it('calls quit when Ctrl+C is pressed', () => {
      const quitSpy = vi.spyOn(service, 'quit');
      render(<App service={service} />);
      
      expect(keyboardCallback).not.toBeNull();
      keyboardCallback!({ name: 'c', ctrl: true });
      
      expect(quitSpy).toHaveBeenCalled();
    });

    it('opens help when ? is pressed and q closes help without quitting', async () => {
      const { rerender } = render(<App service={service} />);
      
      expect(keyboardCallback).not.toBeNull();
      
      // Press ? to enter help mode
      keyboardCallback!({ name: '?' });
      
      // Re-render to apply state change
      rerender(<App service={service} />);
      
      // Now in help mode, q should close help, not quit
      const quitSpy = vi.spyOn(service, 'quit');
      keyboardCallback!({ name: 'q' });
      
      // Should NOT have quit since we were in help mode
      expect(quitSpy).not.toHaveBeenCalled();
    });

    it('refreshes when r is pressed', () => {
      const refreshSpy = vi.spyOn(service, 'refreshAll');
      render(<App service={service} />);
      
      expect(keyboardCallback).not.toBeNull();
      keyboardCallback!({ name: 'r' });
      
      expect(refreshSpy).toHaveBeenCalledWith(true);
    });
  });
});
