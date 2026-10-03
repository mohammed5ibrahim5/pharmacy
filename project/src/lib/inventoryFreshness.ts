export const INVENTORY_STALE_AFTER_HOURS = 48;

export function inventoryAgeHours(updatedAt: string, now = Date.now()): number | null {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (now - timestamp) / (60 * 60 * 1000));
}

export function isInventoryStale(updatedAt: string, now = Date.now()): boolean {
  const ageHours = inventoryAgeHours(updatedAt, now);
  return ageHours === null || ageHours >= INVENTORY_STALE_AFTER_HOURS;
}

export function inventoryFreshnessLabel(updatedAt: string, now = Date.now()): string {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return 'وقت آخر تحديث غير متاح';

  const ageHours = inventoryAgeHours(updatedAt, now) ?? 0;
  if (ageHours < 1) return 'آخر تحديث خلال ساعة';
  if (ageHours < 24) return `آخر تحديث منذ ${Math.floor(ageHours)} ساعة`;
  if (ageHours < INVENTORY_STALE_AFTER_HOURS) return 'آخر تحديث أمس';

  return `آخر تحديث: ${new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(timestamp)}`;
}
