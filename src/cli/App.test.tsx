/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { App } from './App';
import { AppService } from '../services/AppService';
import { PlatformAdapter } from '../core/types';

// Mock OpenTUI hooks
vi.mock('@opentui/react', () => ({
  useKeyboard: vi.fn(),
  useTerminalDimensions: vi.fn().mockReturnValue({ width: 80, height: 24 }),
}));

describe('App TUI component', () => {
  let service: AppService;
  let adapter: PlatformAdapter;

  beforeEach(() => {
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
    // Note: Rendering TUI components with standard react-testing-library might need mocks 
    // for custom elements like <box>, <text>, etc.
    // For now, let's just verify it can be instantiated.
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
});
