import { Clock3, TriangleAlert } from 'lucide-react';
import { inventoryFreshnessLabel, isInventoryStale } from '@/lib/inventoryFreshness';

export function InventoryFreshness({ updatedAt, compact = false }: { updatedAt: string; compact?: boolean }) {
  const stale = isInventoryStale(updatedAt);
  const Icon = stale ? TriangleAlert : Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${
        compact ? 'text-[9px]' : 'text-[10px]'
      } ${stale ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'} px-2 py-1`}
      title={stale ? 'قد تكون بيانات السعر والمخزون قديمة؛ أكّد التوفر مع الصيدلية.' : undefined}
      role={stale ? 'status' : undefined}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{inventoryFreshnessLabel(updatedAt)}</span>
      {stale && !compact && <span>· أكّد التوفر مع الصيدلية</span>}
    </span>
  );
}
