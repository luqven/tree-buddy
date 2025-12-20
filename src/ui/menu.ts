import { Menu, MenuItem, shell, dialog } from 'electron';
import { Config, Project, Branch, ScopeNode, toSyncStatus } from '../core/types';
import { buildTree } from '../services/scope';
import { statusIcons } from './icons';

interface MenuCtx {
  cfg: Config;
  isRefreshing: boolean;
  onAddProject: () => void;
  onRemoveProject: (id: string) => void;
  onRefresh: () => void;
  onOpenPath: (path: string) => void;
  onQuit: () => void;
}

/**
 * Build branch menu item with status
 */
function mkBranchItem(br: Branch, ctx: MenuCtx): MenuItem {
  const status = toSyncStatus(br.status);
  const ago = br.status.ts ? fmtAgo(br.status.ts) : 'never';

  return new MenuItem({
    label: br.name,
    icon: statusIcons[status],
    sublabel: `checked ${ago}`,
    click: () => ctx.onOpenPath(br.path),
  });
}

/**
 * Build scope submenu recursively
 */
function mkScopeMenu(nodes: ScopeNode[], ctx: MenuCtx): MenuItem[] {
  const items: MenuItem[] = [];

  for (const n of nodes) {
    if (n.branch && n.children.length === 0) {
      // Leaf node with branch
      items.push(mkBranchItem(n.branch, ctx));
    } else if (n.children.length > 0) {
      // Scope with children
      const sub = mkScopeMenu(n.children, ctx);
      if (n.branch) {
        // Scope that is also a branch
        sub.unshift(mkBranchItem(n.branch, ctx));
        sub.unshift(new MenuItem({ type: 'separator' }));
      }
      items.push(
        new MenuItem({
          label: n.name,
          submenu: Menu.buildFromTemplate(sub),
        })
      );
    } else if (n.branch) {
      items.push(mkBranchItem(n.branch, ctx));
    }
  }

  return items;
}

/**
 * Get project label with status indicator
 */
function getProjectLabel(proj: Project, isRefreshing: boolean): string {
  if (isRefreshing && proj.status === 'refreshing') {
    return `${proj.name} …`;
  }
  if (proj.status === 'error') {
    return `⚠️ ${proj.name}`;
  }
  return proj.name;
}

/**
 * Build project submenu
 */
function mkProjectMenu(proj: Project, ctx: MenuCtx): MenuItem {
  const tree = buildTree(proj.branches, {
    delim: ctx.cfg.scopeDelim,
    enabled: ctx.cfg.scopeEnabled,
  });

  const items = mkScopeMenu(tree, ctx);

  items.push(new MenuItem({ type: 'separator' }));
  items.push(
    new MenuItem({
      label: 'Open in Finder',
      click: () => shell.showItemInFolder(proj.root),
    })
  );
  items.push(
    new MenuItem({
      label: 'Remove Project',
      click: () => ctx.onRemoveProject(proj.id),
    })
  );

  return new MenuItem({
    label: getProjectLabel(proj, ctx.isRefreshing),
    submenu: Menu.buildFromTemplate(items),
  });
}

/**
 * Build the full menu
 */
export function buildMenu(ctx: MenuCtx): Menu {
  const items: MenuItem[] = [];

  // Projects
  if (ctx.cfg.projects.length === 0) {
    items.push(
      new MenuItem({
        label: 'No projects yet',
        enabled: false,
      })
    );
  } else {
    for (const p of ctx.cfg.projects) {
      items.push(mkProjectMenu(p, ctx));
    }
  }

  items.push(new MenuItem({ type: 'separator' }));

  // Actions
  items.push(
    new MenuItem({
      label: 'Add Project...',
      click: ctx.onAddProject,
    })
  );
  items.push(
    new MenuItem({
      label: ctx.isRefreshing ? 'Refreshing…' : 'Refresh All',
      enabled: !ctx.isRefreshing,
      click: ctx.onRefresh,
    })
  );

  items.push(new MenuItem({ type: 'separator' }));

  items.push(
    new MenuItem({
      label: 'Quit',
      click: ctx.onQuit,
    })
  );

  return Menu.buildFromTemplate(items);
}

/**
 * Format timestamp as relative time
 */
function fmtAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);

  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

/**
 * Show project discovery dialog
 */
export async function showDiscoveryDialog(candidates: { path: string; name: string }[]): Promise<string | null> {
  if (candidates.length === 0) {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      message: 'No worktree projects found',
      detail: 'Would you like to select a directory manually?',
      buttons: ['Select Directory', 'Cancel'],
    });

    if (response === 0) {
      const { filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        message: 'Select worktree project directory',
      });
      return filePaths[0] ?? null;
    }
    return null;
  }

  // Show selection dialog
  const choices = candidates.map((c) => c.name);
  const { response } = await dialog.showMessageBox({
    type: 'question',
    message: 'Select a worktree project to add',
    detail: 'Found these projects in your Documents folder:',
    buttons: [...choices, 'Browse...', 'Cancel'],
  });

  if (response < candidates.length) {
    return candidates[response].path;
  }

  if (response === candidates.length) {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: 'Select worktree project directory',
    });
    return filePaths[0] ?? null;
  }

  return null;
}

/**
 * Show project name input dialog
 */
export async function showNameDialog(defaultName: string): Promise<string | null> {
  // Electron doesn't have a native prompt, use message box
  const { response } = await dialog.showMessageBox({
    type: 'question',
    message: `Name this project "${defaultName}"?`,
    detail: 'You can rename it later.',
    buttons: ['Use This Name', 'Cancel'],
  });

  return response === 0 ? defaultName : null;
}
