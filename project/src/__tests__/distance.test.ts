import { describe, it, expect } from 'vitest';
import { calculateDistance, formatDistance } from '@/hooks/useGeolocation';

describe('calculateDistance (Haversine)', () => {
  it('returns 0 for same point', () => {
    const d = calculateDistance(30.0444, 31.2357, 30.0444, 31.2357);
    expect(d).toBe(0);
  });

  it('calculates distance between Cairo and Alexandria correctly', () => {
    // Cairo: 30.0444, 31.2357
    // Alexandria: 31.2001, 29.9187
    // Expected: ~178 km
    const d = calculateDistance(30.0444, 31.2357, 31.2001, 29.9187);
    expect(d).toBeGreaterThan(150);
    expect(d).toBeLessThan(210);
  });

  it('calculates short distance correctly', () => {
    // Two points ~1km apart
    const d = calculateDistance(30.0000, 31.2000, 30.0090, 31.2000);
    expect(d).toBeGreaterThan(0.9);
    expect(d).toBeLessThan(1.1);
  });

  it('is symmetric (A→B equals B→A)', () => {
    const d1 = calculateDistance(30.0, 31.0, 31.0, 29.0);
    const d2 = calculateDistance(31.0, 29.0, 30.0, 31.0);
    expect(d1).toBeCloseTo(d2, 6);
  });
});

describe('formatDistance', () => {
  it('formats meters in Arabic', () => {
    expect(formatDistance(0.5, 'ar')).toBe('500 م');
  });

  it('formats km in Arabic', () => {
    expect(formatDistance(3.7, 'ar')).toBe('3.7 كم');
  });

  it('formats meters in English', () => {
    expect(formatDistance(0.5, 'en')).toBe('500 m');
  });

  it('formats km in English', () => {
    expect(formatDistance(3.7, 'en')).toBe('3.7 km');
  });
});
