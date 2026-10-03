import { describe, expect, it } from 'vitest';
import {
  inventoryAgeHours,
  inventoryFreshnessLabel,
  isInventoryStale,
} from '@/lib/inventoryFreshness';

const NOW = Date.parse('2026-10-03T12:00:00.000Z');

describe('inventory freshness', () => {
  it('marks data stale at 48 hours', () => {
    expect(isInventoryStale('2026-10-01T12:00:00.000Z', NOW)).toBe(true);
    expect(isInventoryStale('2026-10-01T12:01:00.000Z', NOW)).toBe(false);
  });

  it('treats invalid timestamps as stale instead of implying freshness', () => {
    expect(inventoryAgeHours('not-a-date', NOW)).toBeNull();
    expect(isInventoryStale('not-a-date', NOW)).toBe(true);
    expect(inventoryFreshnessLabel('not-a-date', NOW)).toBe('وقت آخر تحديث غير متاح');
  });

  it('clamps future timestamps to a recent update', () => {
    expect(inventoryAgeHours('2026-10-04T12:00:00.000Z', NOW)).toBe(0);
    expect(inventoryFreshnessLabel('2026-10-04T12:00:00.000Z', NOW)).toBe(
      'آخر تحديث خلال ساعة',
    );
  });
});
