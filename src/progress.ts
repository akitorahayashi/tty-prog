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
  let timer: ReturnType<typeof setInterval> | undefined;

  const draw = () => {
    stream.write(
      isTty
        ? `\x1b[2K\r${renderLine({
            barWidth,
            completed,
            frame: spinnerFrames[frameIndex] as string,
            isTty,
            label,
            renderLabel,
            total,
          })}`
        : `${renderLine({
            barWidth,
            completed,
            frame: '',
            isTty,
            label,
            renderLabel,
            total,
          })}\n`,
    );
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
        stream.write(
          `\x1b[2K\r${renderLine({
            barWidth,
            completed,
            frame: ' ',
            isTty,
            label: '',
            renderLabel,
            total,
          })}\n`,
        );
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
