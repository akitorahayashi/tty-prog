import { ProgressConfigurationError } from './progress-error';

const defaultBarWidth = 24;
const defaultSpinnerFrames = [
  '⠋',
  '⠙',
  '⠹',
  '⠸',
  '⠼',
  '⠴',
  '⠦',
  '⠧',
  '⠇',
  '⠏',
] as const;
const defaultSpinnerIntervalMs = 80;

export interface ProgressBar {
  setLabel(label: string): void;
  advance(count?: number): void;
  finish(): void;
}

export interface ProgressState {
  completed: number;
  label: string;
  total: number;
}

export interface ProgressWritable {
  columns?: number;
  isTTY?: boolean;
  write(text: string): void;
}

export interface ProgressBarOptions {
  total: number;
  barWidth?: number;
  enabled?: boolean;
  isTty?: boolean;
  label?: string;
  renderLabel?: (state: ProgressState) => string;
  spinnerFrames?: readonly string[];
  spinnerIntervalMs?: number;
  stream?: ProgressWritable;
}

interface RenderOptions {
  barWidth: number;
  completed: number;
  frame: string;
  isTty: boolean;
  label: string;
  renderLabel: (state: ProgressState) => string;
  total: number;
}

interface BarLineOptions {
  barWidth: number;
  completed: number;
  frame: string;
  isTty: boolean;
  total: number;
}

interface Style {
  cyan(text: string): string;
  dim(text: string): string;
}

interface UnrefableTimer {
  unref?: () => void;
}

const noopProgressBar: ProgressBar = {
  advance() {},
  finish() {},
  setLabel() {},
};

export function createProgressBar(options: ProgressBarOptions): ProgressBar {
  const total = validNonNegativeInteger(options.total, 'total');
  const barWidth = validPositiveInteger(
    options.barWidth ?? defaultBarWidth,
    'barWidth',
  );
  const spinnerFrames = validSpinnerFrames(
    options.spinnerFrames ?? defaultSpinnerFrames,
  );
  const spinnerIntervalMs = validPositiveInteger(
    options.spinnerIntervalMs ?? defaultSpinnerIntervalMs,
    'spinnerIntervalMs',
  );

  if (options.enabled === false) {
    return noopProgressBar;
  }

  const stream = options.stream ?? defaultStream();
  if (stream === undefined) {
    throw new ProgressConfigurationError(
      'A writable stream must be provided when process.stderr is not available.',
    );
  }
  const isTty = options.isTty ?? stream.isTTY === true;
  const renderLabel = options.renderLabel ?? ((state) => state.label);
  let completed = 0;
  let frameIndex = 0;
  let label = options.label ?? '';
  let finished = false;
  let hasDrawnTty = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const currentLabel = () => renderLabel({ completed, label, total });

  const draw = () => {
    if (!isTty) {
      stream.write(
        `${renderLine({
          barWidth,
          completed,
          frame: '',
          isTty,
          label,
          renderLabel,
          total,
        })}\n`,
      );
      return;
    }

    const barLine = renderBarLine({
      barWidth,
      completed,
      frame: spinnerFrames[frameIndex] as string,
      isTty,
      total,
    });
    const labelLine = renderLabelLine(currentLabel(), isTty, stream.columns);

    stream.write(
      `${hasDrawnTty ? '\x1b[1A' : ''}\x1b[2K\r${barLine}\n\x1b[2K\r${labelLine}`,
    );
    hasDrawnTty = true;
  };

  draw();

  if (isTty && spinnerFrames.length > 1) {
    timer = setInterval(() => {
      frameIndex = (frameIndex + 1) % spinnerFrames.length;
      draw();
    }, spinnerIntervalMs);
    unrefTimer(timer);
  }

  return {
    advance(count = 1) {
      if (finished) {
        return;
      }
      completed = Math.min(
        total,
        completed + validPositiveInteger(count, 'count'),
      );
      draw();
    },
    finish() {
      if (finished) {
        return;
      }
      finished = true;
      if (timer !== undefined) {
        clearInterval(timer);
      }
      if (isTty) {
        const barLine = renderBarLine({
          barWidth,
          completed,
          frame: ' ',
          isTty,
          total,
        });
        stream.write(`\x1b[2K\r\x1b[1A\x1b[2K\r${barLine}\n`);
      }
    },
    setLabel(nextLabel) {
      if (finished) {
        return;
      }
      label = nextLabel;
      draw();
    },
  };
}

function defaultStream(): ProgressWritable | undefined {
  return typeof process === 'undefined' ? undefined : process.stderr;
}

function unrefTimer(timer: ReturnType<typeof setInterval>): void {
  (timer as UnrefableTimer).unref?.();
}

function renderLine(options: RenderOptions): string {
  const style = makeStyle(options.isTty);
  const filled =
    options.total === 0
      ? options.barWidth
      : Math.min(
          options.barWidth,
          Math.round((options.completed / options.total) * options.barWidth),
        );
  const bar =
    style.cyan('━'.repeat(filled)) +
    style.dim('─'.repeat(options.barWidth - filled));
  const totalText = String(options.total);
  const count = `${String(options.completed).padStart(
    totalText.length,
  )}/${totalText}`;
  const renderedLabel = options.renderLabel({
    completed: options.completed,
    label: options.label,
    total: options.total,
  });
  const prefix =
    options.frame === ''
      ? `${bar}  ${count}`
      : `${style.cyan(options.frame)} ${bar}  ${count}`;

  return renderedLabel === ''
    ? prefix
    : `${prefix}  ${style.dim(renderedLabel)}`;
}

function renderBarLine(options: BarLineOptions): string {
  const style = makeStyle(options.isTty);
  const filled =
    options.total === 0
      ? options.barWidth
      : Math.min(
          options.barWidth,
          Math.round((options.completed / options.total) * options.barWidth),
        );
  const bar =
    style.cyan('━'.repeat(filled)) +
    style.dim('─'.repeat(options.barWidth - filled));
  const totalText = String(options.total);
  const count = `${String(options.completed).padStart(
    totalText.length,
  )}/${totalText}`;

  return `${style.cyan(options.frame)} ${bar}  ${count}`;
}

function renderLabelLine(
  label: string,
  isTty: boolean,
  columns: number | undefined,
): string {
  if (label === '') {
    return '';
  }
  const style = makeStyle(isTty);
  const indent = '  ';
  const text =
    columns === undefined
      ? label
      : truncateToWidth(label, columns - 1 - indent.length);

  return `${indent}${style.dim(text)}`;
}

function truncateToWidth(text: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return '';
  }
  if (displayWidth(text) <= maxWidth) {
    return text;
  }
  let width = 0;
  let kept = '';
  for (const character of text) {
    const characterWidth = displayWidth(character);
    if (width + characterWidth > maxWidth - 1) {
      break;
    }
    kept += character;
    width += characterWidth;
  }
  return `${kept}…`;
}

function displayWidth(text: string): number {
  let width = 0;
  for (const character of text) {
    width += isWideCodePoint(character.codePointAt(0) ?? 0) ? 2 : 1;
  }
  return width;
}

function isWideCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe4f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
    (codePoint >= 0x1f900 && codePoint <= 0x1faff) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  );
}

function validNonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new ProgressConfigurationError(
      `${name} must be a non-negative integer.`,
    );
  }
  return value;
}

function validPositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ProgressConfigurationError(`${name} must be a positive integer.`);
  }
  return value;
}

function validSpinnerFrames(value: readonly string[]): readonly string[] {
  if (value.length === 0 || value.some((frame) => frame.length === 0)) {
    throw new ProgressConfigurationError(
      'spinnerFrames must contain at least one non-empty frame.',
    );
  }
  return value;
}

function makeStyle(isTty: boolean): Style {
  return {
    cyan: (text) => (isTty ? ansi('96', text) : text),
    dim: (text) => (isTty ? ansi('2', text) : text),
  };
}

function ansi(code: string, text: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}
