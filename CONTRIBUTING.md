# Contributing

## Scope

This repository owns:

- `src/` — public exports, feature modules, and library errors
- `tests/` — package behavior tests
- `.github/workflows/` — CI automation

## Workflow

1. Run `bun run fix` before committing.
2. Run `bun run check` to verify lint and types.
3. Run `bun test` to verify behavior.

See [AGENTS.md](AGENTS.md) for development commands, architecture, and implementation rules.

## Runtime Version

The Bun version is fixed by the `packageManager` field in `package.json`. Local development and CI use the same version.
