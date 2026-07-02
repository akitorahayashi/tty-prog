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

TTY streams render an animated bar-and-count line with the label on its own
line beneath it, both redrawn in place on every update. Non-TTY streams emit
one combined log line per render. Progress output is disabled only when
`enabled: false` is set explicitly.

When the stream reports a `columns` count (as `process.stderr` does on a
TTY), the label line is truncated with a trailing ellipsis to fit within it,
so a long label never wraps the terminal and corrupts the display. Streams
that omit `columns` render the full label untruncated.

## Development

```sh
bun run fix
bun run check
bun test
bun run demo   # renders a live progress bar in the terminal, one step per second
```

The package exports its public API from `src/index.ts`. Bun projects can
consume the repository directly from a GitHub URL dependency.
