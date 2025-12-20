import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { ScanCache } from '../core/types';

/**
 * Get cache directory path
 */
export function getCacheDir(home?: string): string {
  const base = home ?? homedir();
  return join(base, '.cache', 'tree-buddy');
}

/**
 * Get scan cache file path
 */
export function getScanCachePath(home?: string): string {
  return join(getCacheDir(home), 'scan.json');
}

/**
 * Load scan cache from disk
 */
export function loadScanCache(home?: string): ScanCache | null {
  const file = getScanCachePath(home);
  if (!existsSync(file)) return null;

  try {
    const raw = readFileSync(file, 'utf-8');
    return JSON.parse(raw) as ScanCache;
  } catch {
    return null;
  }
}

/**
 * Save scan cache to disk
 */
export function saveScanCache(cache: ScanCache, home?: string): void {
  const file = getScanCachePath(home);
  const dir = dirname(file);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(file, JSON.stringify(cache, null, 2));
}

/**
 * Check if cache is stale
 */
export function isCacheStale(cache: ScanCache | null, maxAge: number): boolean {
  if (!cache) return true;
  return Date.now() - cache.ts > maxAge;
}

/**
 * Clear scan cache
 */
export function clearScanCache(home?: string): void {
  const file = getScanCachePath(home);
  if (existsSync(file)) {
    writeFileSync(file, '');
  }
}
