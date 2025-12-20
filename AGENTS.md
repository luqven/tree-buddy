# Agent Guidelines

Code quality and organization standards for this project.

## Requirements

1. **TypeScript only** - No JavaScript files
2. **Unit test each module** - Tests live alongside source (`*.test.ts`)
3. **Conventional commits** - Commit when a reasonable amount of work is done
4. **Max 4 arguments per function** - Use options objects for more
5. **Short variable names** - Prefer concise, readable names

## Code Organization

```
src/
├── core/       # Domain types and pure functions
├── services/   # Business logic (git, storage, caching)
├── ui/         # Electron UI components (menus, icons)
├── main/       # App entry point
└── index.ts    # Public exports
```

## Testing

- Every service module has a corresponding `*.test.ts`
- Use `vitest` for testing
- Run tests before committing: `npm test`
- Tests should be fast and isolated

## Commit Style

Use conventional commits:

```
feat: add new feature
fix: resolve bug
perf: improve performance
refactor: restructure code
test: add or update tests
docs: update documentation
```

## Function Signatures

Prefer options objects over many arguments:

```typescript
// Bad - too many args
function addProject(cfg: Config, path: string, name: string, scan: boolean): Config

// Good - options object
interface AddProjectOpts {
  path: string;
  name?: string;
}
function addProject(cfg: Config, opts: AddProjectOpts): Config
```

## Naming

- Short but clear: `cfg` not `configuration`, `br` not `branch`
- Async functions: suffix with `Async` (e.g., `getStatusAsync`)
- Boolean flags: prefix with `is`/`has` (e.g., `isRefreshing`)

## Extensibility

- Core types are exported from `src/index.ts` for future GUI
- Services are pure functions, not classes
- UI is decoupled from business logic
- UI tweaks: removed Quit icon from header; reserved action slot in project rows to prevent layout shifts when hovering
