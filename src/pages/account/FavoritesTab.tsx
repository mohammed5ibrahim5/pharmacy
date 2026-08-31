import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import type { Pharmacy, Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { PharmacyCard } from '@/components/PharmacyCard';
import {
  Heart, Pill, Store, RefreshCw, AlertTriangle, CheckCircle2,
} from 'lucide-react';

export function FavoritesTab() {
  const { lang } = useLanguage();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const {
    favoriteProducts,
    favoritePharmacies,
    productFavoritesCount,
    pharmacyFavoritesCount,
  } = useFavorites();

  const [favView, setFavView] = useState<'products' | 'pharmacies'>('products');
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [favPharmacies, setFavPharmacies] = useState<Pharmacy[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [favError, setFavError] = useState(false);
  const [favRetryCount, setFavRetryCount] = useState(0);

  const favoritesKey = `${favoriteProducts.join(',')}|${favoritePharmacies.join(',')}`;

  useEffect(() => {
    let cancelled = false;
    const fetchFavorites = async () => {
      setFavLoading(true);
      setFavError(false);
      try {
        const [prodRes, pharmRes] = await Promise.all([
          favoriteProducts.length > 0
            ? supabase.from('products').select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)').in('id', favoriteProducts)
            : Promise.resolve({ data: null }),
          favoritePharmacies.length > 0
            ? supabase.from('pharmacies').select('*').in('id', favoritePharmacies)
            : Promise.resolve({ data: null }),
        ]);
        if (!cancelled) {
          setFavProducts((prodRes.data || []) as Product[]);
          setFavPharmacies((pharmRes.data || []) as Pharmacy[]);
        }
      } catch {
        if (!cancelled) setFavError(true);
      } finally {
        if (!cancelled) setFavLoading(false);
      }
    };
    fetchFavorites();
    return () => { cancelled = true; };
  }, [favoritesKey, favoriteProducts, favoritePharmacies, favRetryCount]);

  const { t } = useLanguage();

  return (
    <>
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Heart className="w-5.5 h-5.5 text-pink-500" />
            {t('المفضلة والمحفوظات')}
          </h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">
            {t('{0} دواء · {1} صيدلية', [productFavoritesCount, pharmacyFavoritesCount])}
          </span>
        </div>

        <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm w-fit">
          {([
            { id: 'products' as const, label: t('الأدوية'), count: productFavoritesCount },
            { id: 'pharmacies' as const, label: t('الصيدليات'), count: pharmacyFavoritesCount },
          ]).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setFavView(v.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 ${favView === v.id ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              style={favView === v.id ? { backgroundColor: themeColors.primaryColor } : undefined}
            >
              {v.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${favView === v.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {v.count}
              </span>
            </button>
          ))}
        </div>

        {favView === 'products' && (
          <section className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-600">
                <Pill className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-black text-slate-900 text-sm">{t('الأدوية المفضلة')}</h3>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 text-[10px] font-black">{productFavoritesCount}</span>
            </div>
            {favLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-100 rounded-3xl h-64 skeleton" />
                ))}
              </div>
            ) : favError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center shadow-sm">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
                <h4 className="font-black text-rose-700 text-base mb-1">{t('تعذر تحميل الأدوية المفضلة')}</h4>
                <p className="text-xs text-rose-500 font-bold mb-4">{t('حدث خطأ أثناء تحميل مفضلتك. حاول مرة أخرى.')}</p>
                <button type="button" onClick={() => setFavRetryCount((c) => c + 1)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('إعادة المحاولة')}
                </button>
              </div>
            ) : favProducts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-sm">
                <Heart className="w-12 h-12 mx-auto text-pink-400 mb-3.5" />
                <h4 className="font-black text-slate-900 text-base mb-1">{t('لا توجد أدوية في المفضلة')}</h4>
                <p className="text-xs text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">
                  {t('اضغط على علامة القلب ♥ بجانب أي منتج من منتجات الأدوية والصحة ليظهر هنا.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {favProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pharmacyName={lang === 'en' ? (product.pharmacy?.name_en || product.pharmacy?.name || '') : product.pharmacy?.name || ''}
                    onClick={product.for_all_pharmacies ? undefined : () => product.pharmacy_id && navigate({ name: 'pharmacy', id: product.pharmacy_id })}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {favView === 'pharmacies' && (
          <section className="space-y-3.5 pt-6 border-t border-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-600">
                <Store className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-black text-slate-900 text-sm">{t('الصيدليات المفضلة')}</h3>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 text-[10px] font-black">{pharmacyFavoritesCount}</span>
            </div>
            {favLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-slate-100 rounded-3xl h-72 skeleton" />
                ))}
              </div>
            ) : favError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center shadow-sm">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
                <h4 className="font-black text-rose-700 text-base mb-1">{t('تعذر تحميل الصيدليات المفضلة')}</h4>
                <p className="text-xs text-rose-500 font-bold mb-4">{t('حدث خطأ أثناء تحميل مفضلتك. حاول مرة أخرى.')}</p>
                <button type="button" onClick={() => setFavRetryCount((c) => c + 1)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('إعادة المحاولة')}
                </button>
              </div>
            ) : favPharmacies.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-sm">
                <Store className="w-12 h-12 mx-auto text-slate-300 mb-3.5" />
                <h4 className="font-black text-slate-900 text-base mb-1">{t('لا توجد صيدليات مفضلة')}</h4>
                <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                  {t('اختر صيدليتك المفضلة وسجلها بالضغط على زر القلب لتتمكن من التصفح السريع للأدوية والخصومات.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favPharmacies.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
