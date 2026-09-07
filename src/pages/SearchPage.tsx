import { useState, useEffect, useMemo } from 'react';
import { Search, Pill, ArrowLeft, Navigation, Package, AlertTriangle, RefreshCw, BadgePercent } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDebounce } from '@/hooks/useDebounce';
import { useCustomer } from '@/context/CustomerContext';
import { useOrder } from '@/context/OrderContext';
import { ProductCard } from '@/components/ProductCard';
import { PharmacyCard } from '@/components/PharmacyCard';
import { OtcFilterToggle } from '@/components/OtcFilterToggle';
import { getPharmacyWithDistance, sortPharmaciesByDistance } from '@/lib/distance';
import { trackSearch } from '@/lib/searchHistory';
import { smartSearch, findCheaperAlternatives } from '@/lib/search';
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
  const { user } = useCustomer();
  const { cart } = useOrder();
  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [previousOrderedIds, setPreviousOrderedIds] = useState<string[]>([]);
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
            .or(`name.ilike.${searchTerm},name_en.ilike.${searchTerm},active_ingredient.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .eq('is_available', true)
            .order('name'),
          supabase
            .from('pharmacies')
            .select('*')
            .or(`name.ilike.${searchTerm},name_en.ilike.${searchTerm},description.ilike.${searchTerm},area.ilike.${searchTerm}`)
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

  // Load the customer's recent purchases (for "reorder" suggestions)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('orders')
      .select('product_id')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const ids = Array.from(new Set(data.map((r) => r.product_id).filter(Boolean)));
        setPreviousOrderedIds(ids);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const cartProductIds = useMemo(() => cart.map((c) => c.product.id), [cart]);

  // Smart ranking of the products against the query
  const ranked = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return smartSearch(debouncedQuery, {
      products,
      onlyAvailable: true,
      previousOrderedProductIds: previousOrderedIds,
      cartProductIds,
    }).map((r) => r.product);
  }, [debouncedQuery, products, previousOrderedIds, cartProductIds]);

  // Cheaper alternatives for the top-ranked product
  const cheaperAlternatives = useMemo(() => {
    if (ranked.length === 0) return [];
    const top = ranked[0];
    const result = findCheaperAlternatives(top, products);
    // manual exact-ingredient approach already covered by smartSearch; here we filter
    // products that share the ingredient but are cheaper, available, and not already shown.
    return result.filter((p) => !ranked.some((r) => r.id === p.id));
  }, [ranked, products]);

  // Pharmacies that actually stock the product (stock_quantity > 0) near the user
  const nearestPharmaciesInStock = useMemo(() => {
    if (ranked.length === 0) return [];
    const topIds = new Set(ranked.slice(0, 3).map((p) => p.id));
    const inStockPharmacyIds = new Set(
      products.filter((p) => p.stock_quantity > 0 && p.is_available).map((p) => p.pharmacy_id)
    );
    const valid = pharmacies.filter((p) => inStockPharmacyIds.has(p.id));
    // Prefer pharmacies tied to a ranked product
    const rankedPharmacyIds = new Set(
      products.filter((p) => topIds.has(p.id) && p.stock_quantity > 0).map((p) => p.pharmacy_id)
    );
    const withDistance = valid.map((p) => getPharmacyWithDistance(p, location?.latitude, location?.longitude));
    const scored = withDistance.map((p) => ({
      pharmacy: p,
      rankBonus: rankedPharmacyIds.has(p.id) ? -1 : 0,
    }));
    scored.sort((a, b) =>
      (a.pharmacy.distance ?? Infinity) + a.rankBonus - ((b.pharmacy.distance ?? Infinity) + b.rankBonus)
    );
    return scored.slice(0, 4).map((s) => s.pharmacy);
  }, [ranked, products, pharmacies, location]);

  const visibleProducts = useMemo(
    () => (otcOnly ? ranked.filter((p) => !p.requires_prescription) : ranked),
    [ranked, otcOnly]
  );

  const hasNoResults = ranked.length === 0;

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
      ) : hasNoResults && pharmacies.length === 0 ? (
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
          {/* Cheaper alternatives suggestion */}
          {cheaperAlternatives.length > 0 && (
            <section className="rounded-3xl border p-5 sm:p-6" style={{ borderColor: `${themeColors.priceColor}25`, background: `${themeColors.priceColor}06` }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColors.priceColor}14` }}>
                  <BadgePercent className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                </div>
                <div>
                  <h2 className="text-base font-black" style={{ color: themeColors.sectionHeadingText }}>{t('بدائل أرخص لنفس المادة الفعالة')}</h2>
                  <p className="text-[11px] font-bold" style={{ color: themeColors.sectionSubheadingText }}>{t('نفس المادة الفعالة بسعر أقل — استشر الصيدلي قبل التبديل')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cheaperAlternatives.slice(0, 4).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pharmacyName={lang === 'en' ? (product.pharmacy?.name_en || product.pharmacy?.name || '') : product.pharmacy?.name || ''}
                    onClick={product.for_all_pharmacies ? undefined : () => navigate({ name: 'pharmacy', id: product.pharmacy_id })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Nearest pharmacies that actually have the product in stock */}
          {nearestPharmaciesInStock.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColors.accentColor}12` }}>
                  <Navigation className="w-4 h-4" style={{ color: themeColors.accentColor }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: themeColors.sectionHeadingText }}>
                    {location ? t('أقرب صيدليات بها المنتج متوفراً فعلياً') : t('صيدليات بها المنتج متوفراً فعلياً')}
                  </h2>
                  <p className="text-[11px] font-bold" style={{ color: themeColors.sectionSubheadingText }}>{t('حسب مواقعك الحالية والمخزون المتاح')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearestPharmaciesInStock.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
                ))}
              </div>
            </section>
          )}

          {/* Products found */}
          {ranked.length > 0 && (
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

          {/* Pharmacies matched (by name/description) */}
          {pharmacies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColors.primaryColor}12` }}>
                  <Navigation className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
                </div>
                <h2 className="text-lg font-bold" style={{ color: themeColors.sectionHeadingText }}>{t('الصيدليات ({0})', [pharmacies.length])}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortPharmaciesByDistance(pharmacies.map((p) => getPharmacyWithDistance(p, location?.latitude, location?.longitude))).map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}