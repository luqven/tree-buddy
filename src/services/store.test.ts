import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Config, defaultConfig } from '../core/types';
import {
  load,
  save,
  addProject,
  rmProject,
  updateProject,
  getProject,
  setScope,
  hasProject,
  getCfgPath,
} from './store';

describe('store service', () => {
  let testDir: string;
  let cfgFile: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'tree-buddy-store-'));
    cfgFile = getCfgPath(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('returns default config when file missing', () => {
      const cfg = load(testDir);
      expect(cfg.projects).toEqual([]);
      expect(cfg.scopeEnabled).toBe(true);
    });

    it('loads existing config', () => {
      const dir = join(testDir, '.config', 'tree-buddy');
      mkdirSync(dir, { recursive: true });
      const custom: Config = {
        scopeDelim: '-',
        scopeEnabled: false,
        projects: [],
      };
      writeFileSync(cfgFile, JSON.stringify(custom));

      const cfg = load(testDir);
      expect(cfg.scopeDelim).toBe('-');
      expect(cfg.scopeEnabled).toBe(false);
    });
  });

  describe('save', () => {
    it('creates config directory and file', () => {
      const cfg = defaultConfig();
      cfg.scopeDelim = '::';
      save(cfg, testDir);

      expect(existsSync(cfgFile)).toBe(true);
      const loaded = JSON.parse(readFileSync(cfgFile, 'utf-8'));
      expect(loaded.scopeDelim).toBe('::');
    });
  });

  describe('addProject', () => {
    it('adds project with custom name', () => {
      const cfg = defaultConfig();
      const updated = addProject(cfg, { path: '/tmp/fake', name: 'MyProject' });

      expect(updated.projects.length).toBe(1);
      expect(updated.projects[0].name).toBe('MyProject');
      expect(updated.projects[0].root).toBe('/tmp/fake');
      expect(updated.projects[0].id).toBeTruthy();
    });

    it('uses path basename as default name', () => {
      const cfg = defaultConfig();
      const updated = addProject(cfg, { path: '/tmp/my-repo' });

      expect(updated.projects[0].name).toBe('my-repo');
    });

    it('preserves existing projects', () => {
      let cfg = defaultConfig();
      cfg = addProject(cfg, { path: '/tmp/a', name: 'A' });
      cfg = addProject(cfg, { path: '/tmp/b', name: 'B' });

      expect(cfg.projects.length).toBe(2);
    });
  });

  describe('rmProject', () => {
    it('removes project by id', () => {
      let cfg = defaultConfig();
      cfg = addProject(cfg, { path: '/tmp/a', name: 'A' });
      const id = cfg.projects[0].id;

      cfg = rmProject(cfg, id);
      expect(cfg.projects.length).toBe(0);
    });

    it('does nothing for unknown id', () => {
      let cfg = defaultConfig();
      cfg = addProject(cfg, { path: '/tmp/a', name: 'A' });

      cfg = rmProject(cfg, 'unknown');
      expect(cfg.projects.length).toBe(1);
    });
  });

  describe('updateProject', () => {
    it('updates existing project', () => {
      let cfg = defaultConfig();
      cfg = addProject(cfg, { path: '/tmp/a', name: 'A' });
      const proj = { ...cfg.projects[0], name: 'Updated' };

      cfg = updateProject(cfg, proj);
      expect(cfg.projects[0].name).toBe('Updated');
    });
  });

  describe('getProject', () => {
    it('returns project by id', () => {
      let cfg = defaultConfig();
      cfg = addProject(cfg, { path: '/tmp/a', name: 'A' });
      const id = cfg.projects[0].id;

      const proj = getProject(cfg, id);
      expect(proj).toBeDefined();
      expect(proj!.name).toBe('A');
    });

    it('returns undefined for unknown id', () => {
      const cfg = defaultConfig();
      expect(getProject(cfg, 'nope')).toBeUndefined();
    });
  });

  describe('setScope', () => {
    it('updates scope settings', () => {
      let cfg = defaultConfig();
      cfg = setScope(cfg, false, '::');

      expect(cfg.scopeEnabled).toBe(false);
      expect(cfg.scopeDelim).toBe('::');
    });

    it('keeps delimiter if not provided', () => {
      let cfg = defaultConfig();
      cfg = setScope(cfg, false);

      expect(cfg.scopeEnabled).toBe(false);
      expect(cfg.scopeDelim).toBe('/');
    });
  });

  describe('hasProject', () => {
    it('returns true if project exists', () => {
      let cfg = defaultConfig();
      cfg = addProject(cfg, { path: '/tmp/a', name: 'A' });

      expect(hasProject(cfg, '/tmp/a')).toBe(true);
    });

    it('returns false if project missing', () => {
      const cfg = defaultConfig();
      expect(hasProject(cfg, '/tmp/nope')).toBe(false);
    });
  });

  describe('failure tolerance', () => {
    it('load returns default config when file is corrupted', () => {
      const dir = join(testDir, '.config', 'tree-buddy');
      mkdirSync(dir, { recursive: true });
      writeFileSync(cfgFile, 'invalid json');

      const cfg = load(testDir);
      expect(cfg.projects).toEqual([]);
    });

    it('addProject works even if git fails to list branches', () => {
      const cfg = defaultConfig();
      // Use an invalid path that will cause git commands to fail
      const updated = addProject(cfg, { path: '/invalid/git/path' });

      expect(updated.projects.length).toBe(1);
      expect(updated.projects[0].branches).toEqual([]);
    });
  });
});
