# AGENTS.md

## Directory Structure

```text
src/
  index.ts            Public export boundary
  errors.ts           Library error base classes and feature errors
  <feature>.ts        Focused library feature modules
tests/
  <feature>.test.ts   Public behavior tests for feature modules
```

## Architecture

### Public API

`src/index.ts` owns the package export surface. Public functions, classes, and types are re-exported from this file. Internal modules are not imported directly by consumers.

### Feature Modules

Feature modules expose small, typed APIs. Each module owns its validation rules and throws library-specific errors for invalid input.

### Errors

`errors.ts` exports `BunLibError` as the shared library error base. Feature-specific errors extend `BunLibError`.

## Development Commands

```sh
bun run fix      # Biome autofix
bun run check    # Biome lint + tsc --noEmit
bun test         # Run all tests
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
