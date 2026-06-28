import { describe, expect, test } from 'bun:test';
import { createSlug, SlugValidationError } from '../src';

describe('createSlug', () => {
  test('normalizes text into a lowercase hyphenated slug', () => {
    expect(createSlug(' Hello, Bun Library! ')).toBe('hello-bun-library');
  });

  test('supports underscore separators', () => {
    expect(createSlug('Bun Library', { separator: '_' })).toBe('bun_library');
  });

  test('removes diacritics', () => {
    expect(createSlug('Crème Brûlée')).toBe('creme-brulee');
  });

  test('limits output length without a trailing separator', () => {
    expect(createSlug('Bun library template', { maxLength: 12 })).toBe(
      'bun-library',
    );
  });

  test('fails when input has no slug content', () => {
    expect(() => createSlug('---')).toThrow(SlugValidationError);
  });

  test('fails when maxLength is invalid', () => {
    expect(() => createSlug('Bun', { maxLength: 0 })).toThrow(
      SlugValidationError,
    );
  });
});
