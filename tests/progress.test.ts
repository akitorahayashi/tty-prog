import { describe, expect, test } from 'bun:test';
import { createProgressBar, ProgressConfigurationError } from '../src';

describe('createProgressBar', () => {
  test('updates a single TTY line and writes a final newline', () => {
    const writes: string[] = [];
    const progress = createProgressBar({
      total: 3,
      isTty: true,
      label: 'installing',
      spinnerFrames: ['.'],
      stream: {
        write: (text) => writes.push(text),
      },
    });

    progress.advance();
    progress.setLabel('done');
    progress.advance(2);
    progress.finish();
    progress.finish();

    expect(writes).toHaveLength(5);
    expect(writes.every((text) => text.startsWith('\x1b[2K\r'))).toBe(true);
    expect(writes[0]).toContain('0/3');
    expect(writes[1]).toContain('1/3');
    expect(writes[2]).toContain('done');
    expect(writes[3]).toContain('3/3');
    expect(writes[4]).toContain('3/3');
    expect(writes[4]?.endsWith('\n')).toBe(true);
  });

  test('emits one line per render for non-TTY streams', () => {
    const writes: string[] = [];
    const progress = createProgressBar({
      total: 2,
      isTty: false,
      label: 'narration',
      stream: {
        write: (text) => writes.push(text),
      },
    });

    progress.advance();
    progress.advance();
    progress.finish();

    expect(writes).toHaveLength(3);
    expect(writes).toEqual([
      expect.stringMatching(/0\/2 {2}narration\n$/u),
      expect.stringMatching(/1\/2 {2}narration\n$/u),
      expect.stringMatching(/2\/2 {2}narration\n$/u),
    ]);
  });

  test('supports custom label rendering from progress state', () => {
    const writes: string[] = [];
    const progress = createProgressBar({
      total: 4,
      isTty: false,
      renderLabel: (state) => `clip ${state.completed} of ${state.total}`,
      stream: {
        write: (text) => writes.push(text),
      },
    });

    progress.advance(2);
    progress.finish();

    expect(writes.at(-1)).toContain('clip 2 of 4');
  });

  test('does not write when explicitly disabled', () => {
    const writes: string[] = [];
    const progress = createProgressBar({
      total: 1,
      enabled: false,
      stream: {
        write: (text) => writes.push(text),
      },
    });

    progress.advance();
    progress.setLabel('ignored');
    progress.finish();

    expect(writes).toEqual([]);
  });

  test('rejects invalid progress settings', () => {
    expect(() => createProgressBar({ total: -1 })).toThrow(
      ProgressConfigurationError,
    );
    expect(() => createProgressBar({ total: 1, barWidth: 0 })).toThrow(
      ProgressConfigurationError,
    );
    expect(() => createProgressBar({ total: 1, spinnerFrames: [] })).toThrow(
      ProgressConfigurationError,
    );
  });

  test('rejects invalid advance counts', () => {
    const progress = createProgressBar({
      total: 1,
      isTty: false,
      stream: {
        write() {},
      },
    });

    expect(() => progress.advance(0)).toThrow(ProgressConfigurationError);
  });
});
