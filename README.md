# bun-lib

A Bun and TypeScript library template.

## Setup

```sh
bun install
```

## Usage

```ts
import { createSlug } from 'bun-lib';

const slug = createSlug('Hello, Bun Library!');
console.log(slug);
```

## Development

```sh
bun run fix
bun run check
bun test
```

The package exports its public API from `src/index.ts`. Bun projects can consume the repository directly from a GitHub URL dependency.
