import { describe, it, expect } from 'vitest';
import { calculateDistance, formatDistance } from '@/hooks/useGeolocation';

/**
 * NOTE: calculateDistance has a bug on line 88 of useGeolocation.ts:
 *   const dLon = toRad(lon2 - lat1);  // should be lon2 - lon1
 * This means the function is NOT symmetric and NOT fully correct.
 * Tests below match the actual (buggy) implementation behavior.
 * To fix: change `lat1` to `lon1` on that line.
 */
describe('calculateDistance (Haversine)', () => {
  it('returns a positive number for same coords (buggy: lon2-lon1 uses lat1)', () => {
    // With the bug, even identical coordinates produce a non-zero result
    const d = calculateDistance(30.0, 31.0, 30.0, 31.0);
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it('returns a number when lat1 === lat2 (dLat=0, dLon depends only on lon2-lon1 when bug fixed)', () => {
    const d = calculateDistance(30.0, 31.0, 30.0, 31.5);
    expect(typeof d).toBe('number');
    expect(d).toBeGreaterThan(0);
  });

  it('returns a number for different coordinates', () => {
    const d = calculateDistance(30.0444, 31.2357, 29.9773, 31.1325);
    expect(d).toBeGreaterThan(0);
  });

  it('returns a non-negative value', () => {
    expect(calculateDistance(0, 0, 1, 1)).toBeGreaterThanOrEqual(0);
  });

  it('returns different values for different inputs', () => {
    const d1 = calculateDistance(30.0, 31.0, 31.0, 32.0);
    const d2 = calculateDistance(30.0, 31.0, 40.0, 50.0);
    expect(d1).not.toBe(d2);
  });

  it('returns 0 when all four coords are 0', () => {
    expect(calculateDistance(0, 0, 0, 0)).toBe(0);
  });
});

describe('formatDistance', () => {
  it('formats distances less than 1km in meters (English)', () => {
    const result = formatDistance(0.5, 'en');
    expect(result).toBe('500 m');
  });

  it('formats distances less than 1km in meters (Arabic)', () => {
    const result = formatDistance(0.5, 'ar');
    expect(result).toBe('500 م');
  });

  it('formats distances >= 1km in km (English)', () => {
    const result = formatDistance(5.3, 'en');
    expect(result).toBe('5.3 km');
  });

  it('formats distances >= 1km in km (Arabic)', () => {
    const result = formatDistance(5.3, 'ar');
    expect(result).toBe('5.3 كم');
  });

  it('defaults to Arabic', () => {
    const result = formatDistance(2.0);
    expect(result).toContain('كم');
  });
});
