import { describe, it, expect } from 'vitest';
import { toSyncStatus, defaultConfig, genId, GitStatus } from './types';

describe('toSyncStatus', () => {
  it('returns red when behind upstream', () => {
    const s: GitStatus = { ahead: 0, behind: 3, dirty: false, ts: 0 };
    expect(toSyncStatus(s)).toBe('red');
  });

  it('returns red when behind even if dirty', () => {
    const s: GitStatus = { ahead: 2, behind: 1, dirty: true, ts: 0 };
    expect(toSyncStatus(s)).toBe('red');
  });

  it('returns yellow when dirty but not behind', () => {
    const s: GitStatus = { ahead: 5, behind: 0, dirty: true, ts: 0 };
    expect(toSyncStatus(s)).toBe('yellow');
  });

  it('returns green when clean and not behind', () => {
    const s: GitStatus = { ahead: 0, behind: 0, dirty: false, ts: 0 };
    expect(toSyncStatus(s)).toBe('green');
  });

  it('returns green when ahead but clean', () => {
    const s: GitStatus = { ahead: 10, behind: 0, dirty: false, ts: 0 };
    expect(toSyncStatus(s)).toBe('green');
  });
});

describe('defaultConfig', () => {
  it('returns config with scope enabled', () => {
    const cfg = defaultConfig();
    expect(cfg.scopeEnabled).toBe(true);
    expect(cfg.scopeDelim).toBe('/');
    expect(cfg.projects).toEqual([]);
  });
});

describe('genId', () => {
  it('generates unique ids', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(genId());
    }
    expect(ids.size).toBe(100);
  });

  it('generates non-empty strings', () => {
    const id = genId();
    expect(id.length).toBeGreaterThan(5);
  });
});
