import { describe, it, expect } from 'vitest';
import { toSyncStatus, defaultConfig, genId, GitStatus, getCleanupItems } from './types';

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

describe('getCleanupItems', () => {
  const mockProjects = [
    {
      id: 'p1',
      root: '/root',
      branches: [
        { name: 'main', path: '/root/main', isMain: true, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        { name: 'current', path: '/root/curr', isCurrent: true, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        { name: 'locked', path: '/root/lock', locked: true, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        { name: 'merged', path: '/root/merged', cleanupIconType: 'broom' as const, status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
        { name: 'feature', path: '/root/feat', status: { ahead: 0, behind: 0, dirty: false, ts: 0 } },
      ],
    },
  ] as any;

  it('filters out protected branches (main, current, locked)', () => {
    const items = getCleanupItems(mockProjects, 'trash');
    const paths = items.map(i => i.path);
    expect(paths).not.toContain('/root/main');
    expect(paths).not.toContain('/root/curr');
    expect(paths).not.toContain('/root/lock');
    expect(paths).toContain('/root/merged');
    expect(paths).toContain('/root/feat');
  });

  it('only includes broom items when type is broom', () => {
    const items = getCleanupItems(mockProjects, 'broom');
    const paths = items.map(i => i.path);
    expect(paths).toContain('/root/merged');
    expect(paths).not.toContain('/root/feat');
    expect(paths).toHaveLength(1);
    expect(items[0].force).toBe(false);
  });
});
