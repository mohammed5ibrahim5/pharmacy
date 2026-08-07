import { useState, useEffect, useMemo } from 'react';
import { Search, Pill, ArrowLeft, Navigation, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ProductCard } from '@/components/ProductCard';
import { PharmacyCard } from '@/components/PharmacyCard';
import { getPharmacyWithDistance, sortPharmaciesByDistance } from '@/lib/distance';
import { trackSearch } from '@/lib/searchHistory';
import type { Product, Pharmacy } from '@/types';

interface Props {
  query: string;
}

export function SearchPage({ query }: Props) {
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const { location } = useGeolocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackSearch(query);
    const search = async () => {
      setLoading(true);
      const searchTerm = `%${query}%`;
      const [prodRes, pharmRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)')
          .or(`name.ilike.${searchTerm},name_en.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .eq('is_available', true)
          .order('name'),
        supabase
          .from('pharmacies')
          .select('*')
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},area.ilike.${searchTerm}`)
          .eq('is_active', true),
      ]);
      setProducts(prodRes.data || []);
      setPharmacies(pharmRes.data || []);
      setLoading(false);
    };
    search();
  }, [query]);

  // Get unique pharmacies that have matching products, sorted by distance
  const nearestPharmaciesWithProduct = useMemo(() => {
    const hasGlobalProduct = products.some((p) => p.for_all_pharmacies);
    const pharmacyIds = new Set(products.map((p) => p.pharmacy_id));
    const matching = pharmacies
      .filter((p) => hasGlobalProduct || pharmacyIds.has(p.id))
      .map((p) => getPharmacyWithDistance(p, location?.latitude, location?.longitude));
    return sortPharmaciesByDistance(matching);
  }, [products, pharmacies, location]);

return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate({ name: 'home' })}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        العودة للرئيسية
      </button>

      {/* Header hero */}
      <div className="relative rounded-3xl p-8 mb-8 overflow-hidden border shadow-2xs"
        style={{ background: `linear-gradient(135deg, ${themeColors.pharmacyHeaderBg}, ${themeColors.sectionBg})`, borderColor: `${themeColors.priceColor}20` }}>
        <div className="absolute inset-0 bg-[radial-gradient(transparent_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-10" />
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full opacity-[0.1] blur-3xl" style={{ backgroundColor: themeColors.priceColor }} />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border" style={{ backgroundColor: themeColors.cardBg, borderColor: `${themeColors.priceColor}20` }}>
            <Search className="w-8 h-8" style={{ color: themeColors.priceColor }} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black" style={{ color: themeColors.sectionHeadingText }}>نتائج البحث</h1>
            <p className="mt-1 text-xs" style={{ color: themeColors.sectionSubheadingText }}>
              البحث عن: <span className="font-bold" style={{ color: themeColors.priceColor }}>"{query}"</span>
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-52 animate-pulse" />
            ))}
          </div>
        </div>
      ) : products.length === 0 && pharmacies.length === 0 ? (
        <div className="text-center py-20">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: `${themeColors.priceColor}10` }}
          >
            <Pill className="w-10 h-10" style={{ color: themeColors.priceColor, opacity: 0.5 }} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد نتائج</h3>
          <p className="text-gray-500">لم نجد أي منتج أو صيدلية تطابق "{query}"</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Nearest pharmacies with the product */}
          {nearestPharmaciesWithProduct.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColors.accentColor}12` }}>
                  <Navigation className="w-4 h-4" style={{ color: themeColors.accentColor }} />
                </div>
                <h2 className="text-lg font-bold" style={{ color: themeColors.sectionHeadingText }}>
                  {location ? 'أقرب صيدليات بها هذا المنتج' : 'صيدليات بها هذا المنتج'}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearestPharmaciesWithProduct.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
                ))}
              </div>
            </section>
          )}

          {/* Products found */}
          {products.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColors.priceColor}12` }}>
                  <Package className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                </div>
                <h2 className="text-lg font-bold" style={{ color: themeColors.sectionHeadingText }}>المنتجات ({products.length})</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pharmacyName={product.pharmacy?.name}
                    onClick={product.for_all_pharmacies ? undefined : () => navigate({ name: 'pharmacy', id: product.pharmacy_id })}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
