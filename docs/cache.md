# Cache Service

The `cache` service manages temporary data that is expensive to recalculate. Located at `src/services/cache.ts`.

## Paths

| Function | Description |
|----------|-------------|
| `getCacheDir(home?)` | Get cache directory (`~/.cache/tree-buddy/`) |
| `getScanCachePath(home?)` | Get scan cache file path (`~/.cache/tree-buddy/scan.json`) |

## Cache Operations

| Function | Description |
|----------|-------------|
| `loadScanCache(home?)` | Load scan results from disk. Returns `null` if missing. |
| `saveScanCache(cache, home?)` | Persist scan results to disk |
| `isCacheStale(cache, maxAge)` | Check if cache is older than `maxAge` milliseconds |
| `clearScanCache(home?)` | Delete the scan cache file |

## Usage

The scan cache stores discovered worktree projects to avoid rescanning `~/Documents` on every startup.

```typescript
const cache = loadScanCache();

if (isCacheStale(cache, 5 * 60 * 1000)) {
  // Cache is older than 5 minutes, rescan
  const candidates = await scanForWorktreesAsync('~/Documents');
  saveScanCache({ timestamp: Date.now(), candidates });
}
```
