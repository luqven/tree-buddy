# Cache Service

The `cache` service manages temporary data that is expensive to recalculate, such as the results of a recursive directory scan for new projects. It stores data in `~/.cache/tree-buddy/scan.json`.

## Key Functions

- `loadScanCache()`: Loads discovered worktree candidates from disk.
- `saveScanCache(cache)`: Persists scan results for faster future access.
- `isCacheStale(cache, maxAge)`: Determines if a cache entry should be refreshed based on its timestamp.
- `clearScanCache()`: Removes the current scan cache file.
