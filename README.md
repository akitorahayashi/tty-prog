# tty-prog

TTY progress bar rendering for Bun and TypeScript CLIs.

## Setup

```sh
bun install
```

## Usage

```ts
import { createProgressBar } from 'tty-prog';

const progress = createProgressBar({
  total: 10,
  label: 'starting',
  stream: process.stderr,
  isTty: process.stderr.isTTY === true,
});

progress.setLabel('processing item 1');
progress.advance();
progress.finish();
```

TTY streams render an animated single-line progress bar. Non-TTY streams emit
one log line per render. Progress output is disabled only when `enabled: false`
is set explicitly.

## Development

```sh
bun run fix
bun run check
bun test
```

The package exports its public API from `src/index.ts`. Bun projects can
consume the repository directly from a GitHub URL dependency.
