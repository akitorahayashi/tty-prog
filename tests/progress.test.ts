import { describe, expect, test } from 'bun:test';
import { createProgressBar, ProgressConfigurationError } from '../src';

function visible(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strips ANSI escapes
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]|\r/gu, '');
}

function lines(text: string): string[] {
  return visible(text).replace(/\n$/u, '').split('\n');
}

describe('createProgressBar', () => {
  test('renders a bar line and a label line beneath it, redrawing both in place', () => {
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
    expect(writes[0]?.startsWith('\x1b[1A')).toBe(false);
    expect(writes.slice(1, 4).every((text) => text.startsWith('\x1b[1A'))).toBe(
      true,
    );
    expect(lines(writes[0] as string)).toEqual([
      `. ${'─'.repeat(24)}  0/3`,
      '  installing',
    ]);
    expect(lines(writes[1] as string)[0]).toContain('1/3');
    expect(lines(writes[2] as string)[1]).toBe('  done');
    expect(lines(writes[3] as string)[0]).toContain('3/3');
    expect(lines(writes[4] as string)).toEqual([`  ${'━'.repeat(24)}  3/3`]);
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

  test('truncates the label line so it never exceeds the columns', () => {
    const writes: string[] = [];
    const columns = 40;
    const progress = createProgressBar({
      total: 4,
      barWidth: 10,
      isTty: true,
      label: 'contents/reaction_vertical_short/planned/at-the-bottom',
      spinnerFrames: ['.'],
      stream: {
        columns,
        write: (text) => writes.push(text),
      },
    });
    progress.finish();

    for (const [barLine, labelLine] of writes.map(lines)) {
      expect((barLine as string).length).toBeLessThanOrEqual(columns - 1);
      if (labelLine !== undefined) {
        expect(labelLine.length).toBeLessThanOrEqual(columns - 1);
      }
    }
    expect(lines(writes[0] as string)[1]).toContain('…');
  });

  test('keeps a label that exactly fits its own line untouched', () => {
    const writes: string[] = [];
    const label = 'abcde';
    const progress = createProgressBar({
      total: 4,
      barWidth: 10,
      isTty: true,
      label,
      spinnerFrames: ['.'],
      // indent(2) + label(5) = 7 = columns - 1
      stream: {
        columns: 8,
        write: (text) => writes.push(text),
      },
    });
    progress.finish();

    const [, labelLine] = lines(writes[0] as string);
    expect(labelLine).toBe(`  ${label}`);
  });

  test('drops the label entirely when no width remains for it', () => {
    const writes: string[] = [];
    const progress = createProgressBar({
      total: 4,
      barWidth: 10,
      isTty: true,
      label: 'ignored',
      spinnerFrames: ['.'],
      stream: {
        columns: 3,
        write: (text) => writes.push(text),
      },
    });
    progress.finish();

    const [, labelLine] = lines(writes[0] as string);
    expect((labelLine as string).trim()).toBe('');
  });

  test('counts wide characters as two cells when truncating the label line', () => {
    const writes: string[] = [];
    const columns = 30;
    const progress = createProgressBar({
      total: 4,
      barWidth: 10,
      isTty: true,
      label: 'コンテンツの縦長リアクション',
      spinnerFrames: ['.'],
      stream: {
        columns,
        write: (text) => writes.push(text),
      },
    });
    progress.finish();

    const [, labelLine] = lines(writes[0] as string);
    const width = [...(labelLine as string)].reduce(
      (sum, character) =>
        sum + ((character.codePointAt(0) ?? 0) > 0x2e7f ? 2 : 1),
      0,
    );
    expect(width).toBeLessThanOrEqual(columns - 1);
    expect(labelLine).toContain('…');
  });

  test('renders the full label when the stream reports no columns', () => {
    const writes: string[] = [];
    const label = 'a'.repeat(200);
    const progress = createProgressBar({
      total: 4,
      isTty: true,
      label,
      spinnerFrames: ['.'],
      stream: {
        write: (text) => writes.push(text),
      },
    });
    progress.finish();

    const [, labelLine] = lines(writes[0] as string);
    expect(labelLine).toBe(`  ${label}`);
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
