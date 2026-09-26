import { describe, it, expect } from 'vitest';
import { normalizeSearchText, levenshtein } from '@/lib/search';

describe('normalizeSearchText', () => {
  it('lowercases text', () => {
    expect(normalizeSearchText('PARACETAMOL')).toBe('paracetamol');
  });

  it('removes Arabic diacritics', () => {
    expect(normalizeSearchText('بَارَاسِيتَامُول')).toBe('باراسيتامول');
  });

  it('normalizes alef variants', () => {
    expect(normalizeSearchText('أدوية')).toBe('ادويه');
    expect(normalizeSearchText('إدوية')).toBe('ادويه');
    expect(normalizeSearchText('آدوية')).toBe('ادويه');
  });

  it('normalizes ta marbuta to ha', () => {
    expect(normalizeSearchText('مستشفى')).toBe('مستشفي');
  });

  it('normalizes alef maqsura to ya', () => {
    expect(normalizeSearchText('على')).toBe('علي');
  });

  it('trims whitespace', () => {
    expect(normalizeSearchText('  paracetamol  ')).toBe('paracetamol');
  });

  it('handles empty string', () => {
    expect(normalizeSearchText('')).toBe('');
  });

  it('handles null/undefined gracefully', () => {
    expect(normalizeSearchText(null as unknown as string)).toBe('');
    expect(normalizeSearchText(undefined as unknown as string)).toBe('');
  });
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0);
  });

  it('calculates insertion distance', () => {
    expect(levenshtein('', 'abc')).toBe(3);
  });

  it('calculates deletion distance', () => {
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('calculates substitution distance', () => {
    expect(levenshtein('kitten', 'sitten')).toBe(1);
  });

  it('calculates complex edit distance', () => {
    expect(levenshtein('saturday', 'sunday')).toBe(3);
  });

  it('handles single character strings', () => {
    expect(levenshtein('a', 'b')).toBe(1);
    expect(levenshtein('a', 'a')).toBe(0);
  });
});
