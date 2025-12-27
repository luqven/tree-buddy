import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { Config, Project, defaultConfig, genId } from '../core/types.js';
import { listWorktrees } from './git.js';

/**
 * Get config file path
 */
export function getCfgPath(home?: string): string {
  const base = home ?? homedir();
  return join(base, '.config', 'tree-buddy', 'config.json');
}

/**
 * Load config from disk
 */
export function load(home?: string): Config {
  const file = getCfgPath(home);
  if (!existsSync(file)) {
    return defaultConfig();
  }

  try {
    const raw = readFileSync(file, 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return defaultConfig();
  }
}

/**
 * Save config to disk
 */
export function save(cfg: Config, home?: string): void {
  const file = getCfgPath(home);
  const dir = dirname(file);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(file, JSON.stringify(cfg, null, 2));
}

interface AddProjectOpts {
  path: string;
  name?: string;
}

/**
 * Add a new project to config
 */
export function addProject(cfg: Config, opts: AddProjectOpts): Config {
  const branches = listWorktrees(opts.path);
  const name = opts.name || opts.path.split('/').pop() || 'project';

  const proj: Project = {
    id: genId(),
    name,
    root: opts.path,
    branches,
  };

  return {
    ...cfg,
    projects: [...cfg.projects, proj],
  };
}

/**
 * Remove project from config
 */
export function rmProject(cfg: Config, id: string): Config {
  return {
    ...cfg,
    projects: cfg.projects.filter((p) => p.id !== id),
  };
}

/**
 * Update project in config
 */
export function updateProject(cfg: Config, proj: Project): Config {
  return {
    ...cfg,
    projects: cfg.projects.map((p) => (p.id === proj.id ? proj : p)),
  };
}

/**
 * Get project by id
 */
export function getProject(cfg: Config, id: string): Project | undefined {
  return cfg.projects.find((p) => p.id === id);
}

/**
 * Update scope settings
 */
export function setScope(cfg: Config, enabled: boolean, delim?: string): Config {
  return {
    ...cfg,
    scopeEnabled: enabled,
    scopeDelim: delim ?? cfg.scopeDelim,
  };
}

/**
 * Check if project with path exists
 */
export function hasProject(cfg: Config, path: string): boolean {
  return cfg.projects.some((p) => p.root === path);
}
