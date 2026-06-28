import { SlugValidationError } from './errors';

export interface SlugOptions {
  maxLength?: number;
  separator?: '-' | '_';
}

const DEFAULT_SEPARATOR = '-';

export function createSlug(input: string, options: SlugOptions = {}): string {
  const separator = options.separator ?? DEFAULT_SEPARATOR;
  const maxLength = options.maxLength;
  const normalized = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gu, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');

  if (normalized.length === 0) {
    throw new SlugValidationError('Slug input must contain letters or digits.');
  }

  if (maxLength === undefined) {
    return normalized;
  }

  if (!Number.isInteger(maxLength) || maxLength <= 0) {
    throw new SlugValidationError('Slug maxLength must be a positive integer.');
  }

  return normalized
    .slice(0, maxLength)
    .replace(new RegExp(`${separator}+$`, 'g'), '');
}
