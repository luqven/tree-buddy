# Store Service

The `store` service manages the application configuration and project persistence. It handles loading and saving data to `~/.config/tree-buddy/config.json`.

## Key Functions

- `load()`: Loads the user configuration from disk.
- `save(cfg)`: Persists the current configuration to disk.
- `addProject(cfg, opts)`: Adds a new worktree project to the configuration.
- `rmProject(cfg, id)`: Removes a project from the configuration.
- `updateProject(cfg, proj)`: Updates an existing project's data.

## Resilience

- `load()`: If the configuration file is missing or contains invalid JSON, the service gracefully falls back to a default configuration.
- `addProject()`: Handles cases where the initial git scan of a project path fails by returning an entry with an empty branch list.
