import { useState, useEffect, useMemo } from 'react';
import { Search, Pill, ArrowLeft, Navigation, Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDebounce } from '@/hooks/useDebounce';
import { ProductCard } from '@/components/ProductCard';
import { PharmacyCard } from '@/components/PharmacyCard';
import { OtcFilterToggle } from '@/components/OtcFilterToggle';
import { getPharmacyWithDistance, sortPharmaciesByDistance } from '@/lib/distance';
import { trackSearch } from '@/lib/searchHistory';
import type { Product, Pharmacy } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  query: string;
}

export function SearchPage({ query }: Props) {
  const { t, lang } = useLanguage();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const { location } = useGeolocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [otcOnly, setOtcOnly] = useState(false);

  // Debounce query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    trackSearch(debouncedQuery);
    let cancelled = false;
    const search = async () => {
      setLoading(true);
      setError(false);
      try {
        const searchTerm = `%${debouncedQuery}%`;
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
        if (cancelled) return;
        setProducts(prodRes.data || []);
        setPharmacies(pharmRes.data || []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    search();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, retryCount]);

  // Get unique pharmacies that have matching products, sorted by distance
  const nearestPharmaciesWithProduct = useMemo(() => {
    const hasGlobalProduct = products.some((p) => p.for_all_pharmacies);
    const pharmacyIds = new Set(products.map((p) => p.pharmacy_id));
    const matching = pharmacies
      .filter((p) => hasGlobalProduct || pharmacyIds.has(p.id))
      .map((p) => getPharmacyWithDistance(p, location?.latitude, location?.longitude));
    return sortPharmaciesByDistance(matching);
  }, [products, pharmacies, location]);

  const visibleProducts = useMemo(
    () => (otcOnly ? products.filter((p) => !p.requires_prescription) : products),
    [products, otcOnly]
  );

return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate({ name: 'home' })}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {t('العودة للرئيسية')}
      </button>

      {/* Header hero */}
      <div className="relative rounded-3xl p-8 mb-8 overflow-hidden border shadow-2xs"
        style={{ background: `linear-gradient(135deg, ${themeColors.pharmacyHeaderBg}, ${themeColors.sectionBg})`, borderColor: `${themeColors.priceColor}20` }}>
        <div className="absolute inset-0 bg-[radial-gradient(transparent_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-10" />
        <div className="absolute -top-16 -start-16 w-48 h-48 rounded-full opacity-[0.1] blur-3xl" style={{ backgroundColor: themeColors.priceColor }} />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border" style={{ backgroundColor: themeColors.cardBg, borderColor: `${themeColors.priceColor}20` }}>
            <Search className="w-8 h-8" style={{ color: themeColors.priceColor }} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black" style={{ color: themeColors.sectionHeadingText }}>{t('نتائج البحث')}</h1>
            <p className="mt-1 text-xs" style={{ color: themeColors.sectionSubheadingText }}>
              {t('البحث عن:')}{' '}
              <span className="font-bold" style={{ color: themeColors.priceColor }}>"{query}"</span>
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
          <p className="text-sm font-black text-rose-700">{t('تعذر البحث، تحقق من اتصالك بالإنترنت.')}</p>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('إعادة المحاولة')}
          </button>
        </div>
      ) : loading ? (
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('لا توجد نتائج')}</h3>
          <p className="text-gray-500">{t('لم نجد أي منتج أو صيدلية تطابق "{0}"', [query])}</p>
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
                  {location ? t('أقرب صيدليات بها هذا المنتج') : t('صيدليات بها هذا المنتج')}
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
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColors.priceColor}12` }}>
                    <Package className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: themeColors.sectionHeadingText }}>{t('المنتجات ({0})', [visibleProducts.length])}</h2>
                </div>
                <OtcFilterToggle checked={otcOnly} onChange={setOtcOnly} />
              </div>
              {visibleProducts.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      pharmacyName={lang === 'en' ? (product.pharmacy?.name_en || product.pharmacy?.name || '') : product.pharmacy?.name || ''}
                      onClick={product.for_all_pharmacies ? undefined : () => navigate({ name: 'pharmacy', id: product.pharmacy_id })}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center bg-white rounded-2xl border border-gray-200">
                  <p className="text-slate-500 text-sm font-extrabold">{t('لا توجد منتجات بدون وصفة طبية')}</p>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
