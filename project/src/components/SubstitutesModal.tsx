import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Pill, Store, ShoppingCart, CheckCircle2, ArrowLeftRight, Sparkles,
  TrendingDown, Loader2, AlertCircle,
} from 'lucide-react';
import type { Product, Discount } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useOrder } from '@/context/OrderContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';

interface Props {
  product: Product | null;
  onClose: () => void;
}

function calcFinalPrice(p: Product): number {
  const activeDiscount = p.discounts?.find((d: Discount) => d.is_active);
  return activeDiscount
    ? p.price * (1 - activeDiscount.discount_percentage / 100)
    : p.price;
}

export function SubstitutesModal({ product, onClose }: Props) {
  const { t, lang } = useLanguage();
  const { themeColors } = useSettings();
  const { addToCart, cart } = useOrder();
  const [substitutes, setSubstitutes] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!product) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [product]);

  useEffect(() => {
    if (!product || product.is_controlled || !product.active_ingredient) {
      setSubstitutes([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);

    const fetchSubs = async () => {
      try {
        let query = supabase
          .from('products')
          .select('*, pharmacy:pharmacies(*), discounts(*)')
          .neq('id', product.id)
          .eq('is_available', true);

        query = query
          .eq('active_ingredient', product.active_ingredient)
          .eq('is_controlled', false);

        const { data, error } = await query.limit(12);
        if (alive && !error && data) {
          setSubstitutes(data as Product[]);
        }
      } catch {
        // ignore
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchSubs();
    return () => {
      alive = false;
    };
  }, [product]);

  if (!product) return null;

  const currentPrice = calcFinalPrice(product);
  const currentName = lang === 'en' ? (product.name_en || product.name) : product.name;

  const handleAddSub = (sub: Product) => {
    const ok = addToCart(sub, sub.pharmacy?.name);
    if (!ok) return;
    setAddedIds((prev) => new Set(prev).add(sub.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    }, 1800);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-4 sm:p-8"
    >
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-fade-in"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      />
      <div
        className="relative z-10 bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: `${themeColors.primaryColor}15`, color: themeColors.primaryColor }}
            >
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-1.5">
                {t('البدائل والمثائل المتاحة')}
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h3>
              <p className="text-[11px] font-bold text-slate-400 truncate max-w-xs">
                {t('منتجات لها المادة الفعالة نفسها لـ:')} <strong className="text-slate-700">{currentName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900/10 hover:bg-slate-900/20 flex items-center justify-center text-slate-600 transition-colors"
            aria-label={t('إغلاق')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target product pill */}
        <div className="px-6 py-3 bg-teal-50/60 border-b border-teal-100/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 truncate">
            <Pill className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-bold text-teal-900 truncate">{currentName}</span>
          </div>
          <span className="font-black text-teal-700 whitespace-nowrap">{currentPrice.toFixed(2)} {t('ج.م')}</span>
        </div>
        <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t('لا تستبدل دواءً من تلقاء نفسك. استشر الصيدلي أو الطبيب قبل الاستبدال، حتى عند تشابه المادة الفعالة.')}</p>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <p className="text-xs font-bold">{t('جاري البحث عن أفضل البدائل المتوفرة...')}</p>
            </div>
          ) : substitutes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">{t('لا توجد بدائل مسجلة حالياً في هذا القسم')}</p>
              <p className="text-xs">{t('يمكنك رفع روشتتك أو التواصل مع الصيدلية لتوفير بديل مكافئ.')}</p>
            </div>
          ) : (
            substitutes.map((sub) => {
              const subPrice = calcFinalPrice(sub);
              const subName = lang === 'en' ? (sub.name_en || sub.name) : sub.name;
              const isCheaper = subPrice < currentPrice;
              const savingsPct = currentPrice > 0 && isCheaper ? Math.round(((currentPrice - subPrice) / currentPrice) * 100) : 0;
              const inCart = cart.some((c) => c.product.id === sub.id) || addedIds.has(sub.id);

              return (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                      {sub.image_url ? (
                        <img src={sub.image_url} alt="" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <Pill className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">{subName}</h4>
                        {isCheaper && savingsPct > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            <TrendingDown className="w-3 h-3" />
                            {t('أوفر بـ {0}%', [savingsPct])}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                        <Store className="w-3 h-3 text-teal-600 shrink-0" />
                        <span className="truncate">{sub.pharmacy?.name || t('متوفر في الصيدليات')}</span>
                      </p>
                      {sub.active_ingredient && (
                        <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                          🧪 {sub.active_ingredient}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-start sm:text-end">
                      <span className="block font-black text-base text-slate-900">{subPrice.toFixed(2)} {t('ج.م')}</span>
                      {isCheaper && (
                        <span className="block text-[10px] text-emerald-600 font-black">
                          {t('توفير {0} ج.م', [(currentPrice - subPrice).toFixed(2)])}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSub(sub)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                        inCart
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {inCart ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('تمت الإضافة')}
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {t('اختر هذا البديل')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
