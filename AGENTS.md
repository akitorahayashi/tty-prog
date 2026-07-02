# AGENTS.md

## Directory Structure

```text
src/
  index.ts            Public export boundary
  progress.ts         Progress bar implementation and public progress types
  progress-error.ts   Library error classes
tests/
  progress.test.ts    Public behavior tests for progress rendering
scripts/
  demo-progress.ts    Manual terminal demo run via `bun run demo`
```

## Architecture

### Public API

`src/index.ts` owns the package export surface. Public functions, classes, and types are re-exported from this file. Internal modules are not imported directly by consumers.

### Feature Modules

Feature modules expose small, typed APIs. The progress module owns its
validation rules and throws library-specific errors for invalid input.

### Errors

`progress-error.ts` exports `TtyProgressError` as the shared library error
base. Feature-specific errors extend `TtyProgressError`.

## Development Commands

```sh
bun run fix      # Biome autofix
bun run check    # Biome lint + tsc --noEmit
bun test         # Run all tests
bun run demo     # Run the manual terminal demo in scripts/demo-progress.ts
```

## Development Guidelines

- `bun run fix` runs before `bun run check`.
- Tests assert public behavior through exports from `src/index.ts`.
- Feature modules remain framework-independent and avoid process, filesystem, and network side effects unless that is the module's explicit responsibility.
- New public APIs include tests at the package boundary.
- Package consumers import from the package root, not from nested source files.
- The package is consumed as Bun-readable TypeScript from GitHub URL dependencies. No `dist/` build output is required.

## Documentation Rules

Documentation is written in a declarative style describing the current state of the system. Imperative or changelog-style descriptions are not used.
