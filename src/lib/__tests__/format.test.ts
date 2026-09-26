import { describe, it, expect } from 'vitest';
import { localizedDate, localizedTime, localizedDateTime } from '@/lib/format';

const FIXED_DATE = '2025-06-15T14:30:00Z';

describe('localizedDate', () => {
  it('formats date in Arabic (ar-EG)', () => {
    const result = localizedDate(FIXED_DATE, 'ar');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats date in English (en-US)', () => {
    const result = localizedDate(FIXED_DATE, 'en');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('/');
  });

  it('accepts Date objects', () => {
    const result = localizedDate(new Date(FIXED_DATE), 'en');
    expect(typeof result).toBe('string');
  });

  it('accepts timestamps', () => {
    const result = localizedDate(new Date(FIXED_DATE).getTime(), 'en');
    expect(typeof result).toBe('string');
  });
});

describe('localizedTime', () => {
  it('formats time in Arabic', () => {
    const result = localizedTime(FIXED_DATE, 'ar');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats time in English', () => {
    const result = localizedTime(FIXED_DATE, 'en');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('localizedDateTime', () => {
  it('formats datetime in Arabic', () => {
    const result = localizedDateTime(FIXED_DATE, 'ar');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats datetime in English', () => {
    const result = localizedDateTime(FIXED_DATE, 'en');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts custom options', () => {
    const result = localizedDateTime(FIXED_DATE, 'en', { year: 'numeric' });
    expect(result).toContain('2025');
  });
});
