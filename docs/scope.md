# Scope Service

The `scope` service handles the hierarchical grouping of branches based on their names. It transforms a flat list of branches into a tree structure for nested display in the UI.

## Key Functions

- `buildTree(branches, opts)`: Converts an array of `Branch` objects into a list of `ScopeNode` items. This operation can be expensive for many branches and should be memoized in UI components.
- `parseScope(name, delim)`: Splits a branch name into segments based on a delimiter (e.g., `/`).
