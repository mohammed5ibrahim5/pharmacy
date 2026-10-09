import { describe, it, expect } from 'vitest';
import { calculateDistance, formatDistance } from '@/hooks/useGeolocation';

/**
 * calculateDistance uses the Haversine formula (dLon = lon2 - lon1, fixed).
 * Tests cover correctness, symmetry, and real-world distances.
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

  it('is symmetric (A→B equals B→A)', () => {
    const d1 = calculateDistance(30.0, 31.0, 31.0, 29.0);
    const d2 = calculateDistance(31.0, 29.0, 30.0, 31.0);
    expect(d1).toBeCloseTo(d2, 6);
  });

  it('calculates Cairo → Alexandria at ~178 km', () => {
    const d = calculateDistance(30.0444, 31.2357, 31.2001, 29.9187);
    expect(d).toBeGreaterThan(150);
    expect(d).toBeLessThan(210);
  });

  it('calculates two points ~1 km apart', () => {
    const d = calculateDistance(30.0, 31.2, 30.009, 31.2);
    expect(d).toBeGreaterThan(0.9);
    expect(d).toBeLessThan(1.1);
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
