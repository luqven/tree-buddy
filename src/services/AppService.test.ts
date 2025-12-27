import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppService } from './AppService';
import { PlatformAdapter } from '../core/types';
import * as git from './git';
import * as store from './store';
import * as cache from './cache';

vi.mock('./git');
vi.mock('./store');
vi.mock('./cache');
vi.mock('../main/logger');

describe('AppService', () => {
  let adapter: PlatformAdapter;
  let onUpdate: any;
  let service: AppService;

  beforeEach(() => {
    vi.resetAllMocks();
    adapter = {
      openPath: vi.fn(),
      showItemInFolder: vi.fn(),
      trashItem: vi.fn(),
      openTerminal: vi.fn(),
      getDocumentsPath: vi.fn().mockReturnValue('/mock/docs'),
      quit: vi.fn(),
    };
    onUpdate = vi.fn();

    // Mock store.load to return a default config
    vi.mocked(store.load).mockReturnValue({
      projects: [],
      scopeDelim: '/',
      scopeEnabled: true,
    });

    service = new AppService(adapter, onUpdate);
  });

  it('initializes with loaded config', () => {
    expect(store.load).toHaveBeenCalled();
    expect(service.getState().cfg.projects).toEqual([]);
  });

  it('refreshAll updates projects and notifies', async () => {
    const mockProject = { id: '1', name: 'p1', root: '/r1', branches: [] };
    vi.mocked(store.load).mockReturnValue({
      projects: [mockProject],
      scopeDelim: '/',
      scopeEnabled: true,
    });
    service = new AppService(adapter, onUpdate);

    vi.mocked(git.listWorktreesAsync).mockResolvedValue([{ name: 'main', path: '/r1', status: { ahead: 0, behind: 0, dirty: false, ts: 0 }, isMain: true }]);
    vi.mocked(git.refreshStatusesAsync).mockImplementation(async (b) => b);
    vi.mocked(git.getMainBranchAsync).mockResolvedValue('main');
    vi.mocked(git.getMergedBranchesAsync).mockResolvedValue([]);

    await service.refreshAll();

    expect(onUpdate).toHaveBeenCalled();
    const state = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];
    expect(state.cfg.projects[0].branches.length).toBe(1);
    expect(store.save).toHaveBeenCalled();
  });

  it('deleteWorktrees handles bulk operations', async () => {
    const items = [{ root: '/r1', path: '/r1/wt1', useTrash: true }];
    await service.deleteWorktrees(items);

    expect(adapter.trashItem).toHaveBeenCalledWith('/r1/wt1');
    expect(git.pruneWorktreesAsync).toHaveBeenCalledWith('/r1');
    expect(onUpdate).toHaveBeenCalled();
  });
});
