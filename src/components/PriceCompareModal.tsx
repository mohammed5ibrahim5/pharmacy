import { useState, useEffect, useMemo } from 'react';
import { X, Scale, Store, Sparkles, Pill, TrendingDown, CheckCircle2, ShoppingCart, Navigation, MapPin, AlertCircle, ArrowUpDown, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useOrder } from '@/context/OrderContext';
import { useLanguage } from '@/context/LanguageContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCompare } from '@/context/CompareContext';
import { formatDistance, getPharmacyWithDistance } from '@/lib/distance';
import type { Product } from '@/types';

interface Props {
  product: Product;
  onClose: () => void;
}

function finalPrice(p: Product): number {
  const d = p.discounts?.find((d) => d.is_active);
  return d ? p.price * (1 - d.discount_percentage / 100) : p.price;
}

function totalCost(p: Product): number {
  const ph = p.pharmacy;
  const fee = ph && ph.delivery_available && ph.delivery_fee > 0 ? ph.delivery_fee : 0;
  return finalPrice(p) + fee;
}

export function PriceCompareModal({ product, onClose }: Props) {
  const { themeColors } = useSettings();
  const { addToCart, openCart } = useOrder();
  const { t, lang } = useLanguage();
  const { location } = useGeolocation();
  const { isInCompare, toggleCompare, compareList, openCompare } = useCompare();
  const [sameName, setSameName] = useState<Product[]>([]);
  const [alternatives, setAlternatives] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<'price' | 'distance'>('price');
  const [deliveryOnly, setDeliveryOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all([
        // Same product name across pharmacies (available ones)
        product.for_all_pharmacies
          ? Promise.resolve({ data: [] })
          : supabase
              .from('products')
              .select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)')
              .ilike('name', `%${product.name}%`)
              .eq('is_available', true)
              .limit(30),
        // Alternatives with same active ingredient
        product.active_ingredient
          ? supabase
              .from('products')
              .select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)')
              .ilike('active_ingredient', `%${product.active_ingredient}%`)
              .eq('is_available', true)
              .limit(30)
          : Promise.resolve({ data: [] }),
      ]);
      const same = (results[0].data || []) as Product[];
      const alts = (results[1].data || []) as Product[];
      setSameName(
        same
          .filter((p) => p.id !== product.id)
          .filter((p) => !p.for_all_pharmacies && p.pharmacy_id)
      );
      setAlternatives(
        alts.filter(
          (p) =>
            p.id !== product.id &&
            p.active_ingredient === product.active_ingredient &&
            !p.for_all_pharmacies &&
            p.pharmacy_id
        )
      );
    } catch {
      setError(t('تعذر تحميل أسعار المقارنة، حاول مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const currentFinal = finalPrice(product);

  const compareRows = (a: Product, b: Product): number => {
    if (sortMode === 'distance') {
      const da = a.pharmacy ? (getPharmacyWithDistance(a.pharmacy, location?.latitude, location?.longitude).distance ?? null) : null;
      const db = b.pharmacy ? (getPharmacyWithDistance(b.pharmacy, location?.latitude, location?.longitude).distance ?? null) : null;
      if (da == null && db == null) return finalPrice(a) - finalPrice(b);
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    }
    return finalPrice(a) - finalPrice(b);
  };

  const sortedSame = useMemo(
    () => [...sameName].sort(compareRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sameName, sortMode, location]
  );
  const sortedAlts = useMemo(
    () => [...alternatives].sort(compareRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alternatives, sortMode, location]
  );

  const visibleSame = deliveryOnly ? sortedSame.filter((p) => p.pharmacy?.delivery_available) : sortedSame;
  const visibleAlts = deliveryOnly ? sortedAlts.filter((p) => p.pharmacy?.delivery_available) : sortedAlts;
  const cheapestSame = [...visibleSame].sort((a, b) => finalPrice(a) - finalPrice(b))[0];
  const cheapestAlt = [...visibleAlts].sort((a, b) => finalPrice(a) - finalPrice(b))[0];

  const handleAddToCart = (p: Product) => {
    const phName = lang === 'en' ? (p.pharmacy?.name_en || p.pharmacy?.name || '') : p.pharmacy?.name || '';
    const ok = addToCart(p, phName);
    if (!ok) return;
    onClose();
    openCart('cart');
  };

  const renderRow = (p: Product, { isAlt = false }: { isAlt?: boolean } = {}) => {
    const fp = finalPrice(p);
    const list = isAlt ? visibleAlts : visibleSame;
    const cheapest = (isAlt ? visibleAlts : visibleSame)[0];
    const isCheapest = cheapest && fp === finalPrice(cheapest);
    const anyDelivery = list.some((x) => x.pharmacy?.delivery_available);
    const bestTotal = list.length > 1 ? Math.min(...list.map(totalCost)) : null;
    const isBestTotal = anyDelivery && bestTotal != null && totalCost(p) === bestTotal && !!p.pharmacy?.delivery_available;
    const withDist = p.pharmacy ? getPharmacyWithDistance(p.pharmacy, location?.latitude, location?.longitude) : null;
    const inCompare = p.pharmacy_id ? isInCompare(p.pharmacy_id) : false;
    const stockLabel =
      p.stock_quantity <= 0
        ? { key: 'نفدت الكمية', cls: 'bg-red-50 text-red-600 border-red-200' }
        : p.stock_quantity <= 5
          ? { key: 'كمية محدودة', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
          : { key: 'متاح', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

    return (
      <div
        key={p.id}
        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all hover:shadow-md ${
          isCheapest ? 'bg-teal-50/60 border-teal-200' : 'bg-white border-gray-100'
        }`}
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
          {p.image_url ? (
            <img src={p.image_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <Pill className="w-6 h-6 text-gray-300" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-black text-gray-900 truncate">{lang === 'en' ? (p.name_en || p.name) : p.name}</p>
            <span className={`shrink-0 px-1.5 py-0.5 rounded-full border text-[9px] font-black ${stockLabel.cls}`}>
              {t(stockLabel.key)}
            </span>
          </div>
          {(p.form || p.category?.name) && (
            <p className="text-[10px] font-bold text-gray-400 truncate mt-0.5">
              {p.form}
              {p.form && p.category?.name ? ' · ' : ''}
              {p.category?.name}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5 truncate">
            <Store className="w-3 h-3 shrink-0" style={{ color: themeColors.priceColor }} />
            <span className="truncate">
              {(lang === 'en' ? (p.pharmacy?.name_en || p.pharmacy?.name) : p.pharmacy?.name) || t('جميع الصيدليات')}
            </span>
            {withDist && withDist.distance != null && (
              <span className="inline-flex items-center gap-0.5 shrink-0 font-bold text-sky-600">
                <MapPin className="w-3 h-3" />
                <span dir="ltr">{formatDistance(withDist.distance, lang)}</span>
              </span>
            )}
          </div>
          {p.pharmacy_id && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (p.pharmacy) toggleCompare(p.pharmacy);
              }}
              className={`mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold transition-colors ${
                inCompare ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Scale className="w-3 h-3" />
              {inCompare ? t('مضاف للمقارنة ✓') : t('أضف هذه الصيدلية للمقارنة')}
            </button>
          )}
        </div>

        <div className="text-end shrink-0">
          <p className="text-base font-black" style={{ color: themeColors.priceColor }}>
            {fp.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">{t('ج.م')}</span>
          </p>
          {p.discounts?.some((d) => d.is_active) && (
            <p className="text-[10px] text-gray-400 line-through">{p.price.toFixed(2)}</p>
          )}
          {p.pharmacy?.delivery_available && p.pharmacy.delivery_fee > 0 && (
            <p className="text-[10px] font-bold text-gray-400" dir="ltr">
              +{t('توصيل {0} ج.م', [p.pharmacy.delivery_fee.toFixed(0)])}
            </p>
          )}
          {isBestTotal && (
            <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-teal-500/10 text-[9px] font-black text-teal-700">
              <CheckCircle2 className="w-3 h-3" />
              {t('الأرخص شامل التوصيل')}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            onClick={() => handleAddToCart(p)}
            className="px-3 py-1.5 rounded-xl text-white text-[11px] font-extrabold hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-1.5"
            style={{ backgroundColor: themeColors.priceColor }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {t('أضف للسلة')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto relative"
        style={{ backgroundColor: themeColors.modalBodyBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 backdrop-blur-sm px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10 rounded-t-3xl"
          style={{ backgroundColor: themeColors.modalHeaderBg }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${themeColors.priceColor}12`, color: themeColors.priceColor }}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black" style={{ color: themeColors.modalHeaderText }}>
                {t('قارن الأسعار والبدائل')}
              </h2>
              <p className="text-[11px] font-bold truncate max-w-[220px] sm:max-w-sm" style={{ color: themeColors.modalBodyText }}>
                {lang === 'en' ? (product.name_en || product.name) : product.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }}
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-[11px] font-extrabold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all inline-flex items-center gap-1"
              title={t('تحديث الأسعار')}
            >
              <span className={`w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full ${refreshing ? 'animate-spin' : ''}`} />
              {t('تحديث')}
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ color: themeColors.modalHeaderText }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Current product */}
          <div
            className="rounded-2xl border-2 p-4 flex items-center gap-3"
            style={{ borderColor: `${themeColors.priceColor}30`, backgroundColor: themeColors.cardBg }}
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
              {product.image_url ? (
                <img src={product.image_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <Pill className="w-7 h-7 text-gray-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900">{t('السعر الحالي')}</p>
              <p className="text-[11px] text-gray-500 font-bold truncate">
                {lang === 'en'
                  ? (product.pharmacy?.name_en || product.pharmacy?.name || t('جميع الصيدليات'))
                  : product.pharmacy?.name || t('جميع الصيدليات')}
              </p>
            </div>
            <div className="text-end shrink-0">
              <p className="text-lg font-black" style={{ color: themeColors.priceColor }}>
                {currentFinal.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">{t('ج.م')}</span>
              </p>
              {product.discounts?.some((d) => d.is_active) && (
                <p className="text-[10px] text-gray-400 line-through">{product.price.toFixed(2)}</p>
              )}
            </div>
          </div>

          {/* Sort control */}
          <div className="flex flex-wrap items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-[11px] font-bold text-gray-400">{t('ترتيب حسب')}</span>
            <div className="flex rounded-xl border border-gray-200 bg-white p-0.5" style={{ borderColor: `${themeColors.primaryColor}25` }}>
              <button
                type="button"
                onClick={() => setSortMode('price')}
                className={`px-3 py-1.5 rounded-[10px] text-[11px] font-extrabold transition-all ${sortMode === 'price' ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                style={sortMode === 'price' ? { backgroundColor: themeColors.primaryColor } : undefined}
              >
                {t('الأرخص')}
              </button>
              <button
                type="button"
                onClick={() => location && setSortMode('distance')}
                disabled={!location}
                className={`px-3 py-1.5 rounded-[10px] text-[11px] font-extrabold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${sortMode === 'distance' ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                style={sortMode === 'distance' ? { backgroundColor: themeColors.primaryColor } : undefined}
              >
                {t('الأقرب')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDeliveryOnly((v) => !v)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-extrabold transition-all active:scale-95 inline-flex items-center gap-1 ${
                deliveryOnly
                  ? 'text-white'
                  : 'bg-white text-gray-500 hover:text-gray-700'
              }`}
              style={deliveryOnly ? { backgroundColor: themeColors.priceColor, borderColor: themeColors.priceColor } : { borderColor: `${themeColors.primaryColor}25` }}
            >
              <Truck className="w-3.5 h-3.5" />
              {t('التوصيل فقط')}
            </button>
            {compareList.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openCompare();
                }}
                className="ms-auto px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-[11px] font-extrabold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all inline-flex items-center gap-1"
                title={t('قارن الصيدليات ({0})', [compareList.length])}
              >
                <Scale className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
                {t('قارن الصيدليات ({0})', [compareList.length])}
              </button>
            )}
          </div>
          {sortMode === 'distance' && !location && (
            <p className="text-[10px] font-bold text-amber-500 mt-1.5">{t('حدّد موقعك لعرض المسافات')}</p>
          )}

          {error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 flex items-center gap-2 text-red-600 text-sm font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Same product in other pharmacies */}
              {visibleSame.length > 0 ? (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${themeColors.priceColor}12` }}>
                      <Store className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                    </div>
                    <h3 className="text-sm font-black text-gray-900">
                      {t('نفس الدواء في صيدليات أخرى ({0})', [visibleSame.length])}
                    </h3>
                    {cheapestSame && (
                      <span className="ms-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[10px] font-extrabold text-teal-700 shrink-0">
                        <TrendingDown className="w-3 h-3" />
                        {t('الأرخص {0} ج.م', [finalPrice(cheapestSame).toFixed(2)])}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {visibleSame.map((p) => renderRow(p))}
                  </div>
                </section>
              ) : deliveryOnly ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center flex items-center justify-center gap-2 text-sm font-bold text-gray-400">
                  <Truck className="w-4 h-4 shrink-0" />
                  {t('لا توجد صيدليات متاحة للتوصيل حالياً')}
                </div>
              ) : (
                !product.for_all_pharmacies && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Store className="w-4 h-4 text-gray-400" />
                      <h3 className="text-sm font-black text-gray-500">
                        {t('لا توجد صيدليات أخرى توفر نفس الدواء حالياً')}
                      </h3>
                    </div>
                  </section>
                )
              )}

              {/* Alternatives with same active ingredient */}
              {visibleAlts.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${themeColors.accentColor}12` }}>
                      <Sparkles className="w-4 h-4" style={{ color: themeColors.accentColor }} />
                    </div>
                    <h3 className="text-sm font-black text-gray-900">
                      {t('بدائل بنفس المادة الفعالة ({0})', [visibleAlts.length])}
                    </h3>
                    {cheapestAlt && (
                      <span className="ms-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-extrabold text-amber-700 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('البديل الأرخص {0} ج.م', [finalPrice(cheapestAlt).toFixed(2)])}
                      </span>
                    )}
                  </div>
                  {product.active_ingredient && (
                    <p className="text-[11px] text-gray-400 mb-3 font-bold">
                      {t('بدائل تحتوي على نفس المادة الفعالة "{0}" — استشر الصيدلي قبل التبديل.', [product.active_ingredient])}
                    </p>
                  )}
                  <div className="space-y-2">
                    {visibleAlts.map((p) => renderRow(p, { isAlt: true }))}
                  </div>
                </section>
              )}
            </>
          )}

          {!loading && !error && visibleSame.length === 0 && !deliveryOnly && product.for_all_pharmacies && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
              <Navigation className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-500">{t('هذا المنتج متوفر في جميع الصيدليات بنفس السعر')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
