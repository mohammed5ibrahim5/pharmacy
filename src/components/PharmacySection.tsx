import { PharmacyCard } from '@/components/PharmacyCard';
import type { Pharmacy } from '@/types';

interface Props {
  badge: string;
  title: string;
  subtitle?: string;
  pharmacies: (Pharmacy & { distance?: number })[];
  loading: boolean;
  badgeColor?: string;
  className?: string;
}

export function PharmacySection({
  badge,
  title,
  subtitle,
  pharmacies,
  loading,
  badgeColor,
  className = '',
}: Props) {
  if (!loading && pharmacies.length === 0) return null;

  return (
    <section className={className}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-sm font-semibold" style={{ color: badgeColor }}>
              {badge}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse">
                <div className="h-28 bg-gray-100 rounded-t-2xl" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pharmacies.map((pharmacy) => (
              <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
