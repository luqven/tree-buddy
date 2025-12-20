import { app, Tray, shell, nativeImage } from 'electron';
import { join } from 'path';
import { homedir } from 'os';
import { Config, Project } from '../core/types';
import { scanForWorktrees, listWorktrees, refreshStatuses } from '../services/git';
import { load, save, addProject, rmProject, updateProject } from '../services/store';
import { buildMenu, showDiscoveryDialog, showNameDialog } from '../ui/menu';

const DOCS_PATH = join(homedir(), 'Documents');

let tray: Tray | null = null;
let cfg: Config;

/**
 * Refresh branch statuses for all projects
 */
function refreshAll(): void {
  cfg = {
    ...cfg,
    projects: cfg.projects.map((p) => ({
      ...p,
      branches: refreshStatuses(p.branches),
    })),
  };
  save(cfg);
  updateMenu();
}

/**
 * Refresh single project branches
 */
function refreshProject(id: string): void {
  const proj = cfg.projects.find((p) => p.id === id);
  if (!proj) return;

  const branches = listWorktrees(proj.root);
  const updated: Project = {
    ...proj,
    branches: refreshStatuses(branches),
  };

  cfg = updateProject(cfg, updated);
  save(cfg);
  updateMenu();
}

/**
 * Handle add project action
 */
async function handleAddProject(): Promise<void> {
  // Scan for worktree candidates
  const candidates = scanForWorktrees(DOCS_PATH, 3);
  const filtered = candidates.filter((c) => !cfg.projects.some((p) => p.root === c.path));

  const path = await showDiscoveryDialog(filtered);
  if (!path) return;

  const defaultName = path.split('/').pop() || 'project';
  const name = await showNameDialog(defaultName);
  if (!name) return;

  cfg = addProject(cfg, { path, name });
  // Refresh statuses for new project
  const newProj = cfg.projects[cfg.projects.length - 1];
  refreshProject(newProj.id);
}

/**
 * Handle remove project action
 */
function handleRemoveProject(id: string): void {
  cfg = rmProject(cfg, id);
  save(cfg);
  updateMenu();
}

/**
 * Open path in terminal or finder
 */
function handleOpenPath(path: string): void {
  shell.openPath(path);
}

/**
 * Update tray menu
 */
function updateMenu(): void {
  if (!tray) return;

  const menu = buildMenu({
    cfg,
    onAddProject: handleAddProject,
    onRemoveProject: handleRemoveProject,
    onRefresh: refreshAll,
    onOpenPath: handleOpenPath,
    onQuit: () => app.quit(),
  });

  tray.setContextMenu(menu);
}

/**
 * Initialize the app
 */
function init(): void {
  // Load config
  cfg = load();

  // Create tray with native image
  const iconPath = join(app.getAppPath(), 'assets', 'tray-iconTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  // If icon fails to load, create empty 16x16 image
  const trayIcon = icon.isEmpty()
    ? nativeImage.createEmpty().resize({ width: 16, height: 16 })
    : icon;
  trayIcon.setTemplateImage(true);
  tray = new Tray(trayIcon);
  tray.setToolTip('Tree Buddy');

  // Initial menu
  updateMenu();

  // Refresh statuses on click (future: auto-refresh)
  tray.on('click', () => {
    refreshAll();
  });
}

// Hide dock icon on macOS
app.dock?.hide();

app.whenReady().then(init);

app.on('window-all-closed', (e: Event) => {
  // Prevent default quit behavior
  e.preventDefault();
});
