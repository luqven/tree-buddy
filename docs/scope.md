# Scope Service

The `scope` service handles hierarchical grouping of branches based on their names. Located at `src/services/scope.ts`.

## Tree Building

| Function | Description |
|----------|-------------|
| `parseScopes(name, delim)` | Split a branch name into path segments |
| `buildTree(branches, opts)` | Convert flat branch list into tree structure |

### ScopeOpts

```typescript
interface ScopeOpts {
  delim: string;    // Delimiter for splitting names (e.g., '/')
  enabled: boolean; // Whether scoping is enabled
}
```

### Example

```typescript
// Input branches: ['feature/auth/login', 'feature/auth/signup', 'main']
// With delim='/' and enabled=true:

buildTree(branches, { delim: '/', enabled: true })
// Returns:
// [
//   { name: 'feature', branch: null, children: [
//     { name: 'auth', branch: null, children: [
//       { name: 'login', branch: loginBranch, children: [] },
//       { name: 'signup', branch: signupBranch, children: [] }
//     ]}
//   ]},
//   { name: 'main', branch: mainBranch, children: [] }
// ]
```

## Tree Utilities

| Function | Description |
|----------|-------------|
| `flatten(nodes)` | Convert tree back to flat branch list |
| `getPath(node, delim)` | Get full path for a node (e.g., 'feature/auth/login') |
| `countBranches(nodes)` | Count total branches in tree |
| `findNode(nodes, path, delim)` | Find a node by its full path |
