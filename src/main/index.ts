import { app, Tray, shell, nativeImage } from 'electron';
import { join } from 'path';
import { homedir } from 'os';
import { Config, Project } from '../core/types';
import {
  listWorktreesAsync,
  refreshStatusesAsync,
  scanForWorktreesAsync,
} from '../services/git';
import { load, save, addProject, rmProject, updateProject } from '../services/store';
import { loadScanCache, saveScanCache, isCacheStale } from '../services/cache';
import { buildMenu, showDiscoveryDialog, showNameDialog } from '../ui/menu';

const DOCS_PATH = join(homedir(), 'Documents');
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

let tray: Tray | null = null;
let cfg: Config;
let isRefreshing = false;

/**
 * Refresh all project statuses (async, non-blocking)
 */
async function refreshAllAsync(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;
  updateMenu(); // Show "..." indicator

  try {
    const updated = await Promise.all(
      cfg.projects.map(async (p) => {
        try {
          const branches = await listWorktreesAsync(p.root);
          const refreshed = await refreshStatusesAsync(branches);
          return { ...p, branches: refreshed, status: 'ok' as const };
        } catch {
          return { ...p, status: 'error' as const };
        }
      })
    );
    cfg = { ...cfg, projects: updated };
    save(cfg);
  } finally {
    isRefreshing = false;
    updateMenu();
  }
}

/**
 * Refresh single project (async)
 */
async function refreshProjectAsync(id: string): Promise<void> {
  const proj = cfg.projects.find((p) => p.id === id);
  if (!proj) return;

  try {
    const branches = await listWorktreesAsync(proj.root);
    const refreshed = await refreshStatusesAsync(branches);
    const updated: Project = { ...proj, branches: refreshed, status: 'ok' };
    cfg = updateProject(cfg, updated);
  } catch {
    const updated: Project = { ...proj, status: 'error' };
    cfg = updateProject(cfg, updated);
  }

  save(cfg);
  updateMenu();
}

/**
 * Handle add project action
 */
async function handleAddProject(): Promise<void> {
  // Use cached scan or refresh if stale
  let cache = loadScanCache();

  if (!cache || isCacheStale(cache, REFRESH_INTERVAL)) {
    // Scan in background
    const candidates = await scanForWorktreesAsync(DOCS_PATH, 3);
    cache = { ts: Date.now(), candidates };
    saveScanCache(cache);
  }

  const filtered = cache.candidates.filter(
    (c) => !cfg.projects.some((p) => p.root === c.path)
  );

  const path = await showDiscoveryDialog(filtered);
  if (!path) return;

  const defaultName = path.split('/').pop() || 'project';
  const name = await showNameDialog(defaultName);
  if (!name) return;

  cfg = addProject(cfg, { path, name });
  save(cfg);

  // Refresh statuses for new project
  const newProj = cfg.projects[cfg.projects.length - 1];
  await refreshProjectAsync(newProj.id);
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
 * Open path in finder/terminal
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
    isRefreshing,
    onAddProject: handleAddProject,
    onRemoveProject: handleRemoveProject,
    onRefresh: refreshAllAsync,
    onOpenPath: handleOpenPath,
    onQuit: () => app.quit(),
  });

  tray.setContextMenu(menu);
}

/**
 * Initialize the app
 */
function init(): void {
  // Load cached config immediately
  cfg = load();

  // Create tray
  const iconPath = join(app.getAppPath(), 'assets', 'tray-iconTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);

  let trayIcon: Electron.NativeImage;
  if (icon.isEmpty()) {
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      canvas[i * 4] = 100;
      canvas[i * 4 + 1] = 100;
      canvas[i * 4 + 2] = 100;
      canvas[i * 4 + 3] = 255;
    }
    trayIcon = nativeImage.createFromBuffer(canvas, { width: size, height: size });
  } else {
    trayIcon = icon;
  }

  trayIcon.setTemplateImage(true);
  tray = new Tray(trayIcon);
  tray.setToolTip('Tree Buddy');

  // Show cached menu immediately
  updateMenu();

  // Start background refresh interval
  setInterval(refreshAllAsync, REFRESH_INTERVAL);

  // Initial async refresh (non-blocking)
  refreshAllAsync();
}

// Hide dock icon on macOS
app.dock?.hide();

app.whenReady().then(init);

app.on('window-all-closed', (e: Event) => {
  e.preventDefault();
});
