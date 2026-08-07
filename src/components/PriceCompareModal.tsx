import { useState, useEffect } from 'react';
import { X, Scale, Store, ArrowDown, Sparkles, Pill, TrendingDown, CheckCircle2, ShoppingCart, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useOrder } from '@/context/OrderContext';
import type { Product } from '@/types';

interface Props {
  product: Product;
  onClose: () => void;
}

function finalPrice(p: Product): number {
  const d = p.discounts?.find((d) => d.is_active);
  return d ? p.price * (1 - d.discount_percentage / 100) : p.price;
}

export function PriceCompareModal({ product, onClose }: Props) {
  const { settings, themeColors, storeConfig } = useSettings();
  const { openOrder, addToCart, openCart } = useOrder();
  const [sameName, setSameName] = useState<Product[]>([]);
  const [alternatives, setAlternatives] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
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
      setSameName(same.filter((p) => p.id !== product.id));
      setAlternatives(alts.filter((p) => p.id !== product.id && p.active_ingredient === product.active_ingredient));
      setLoading(false);
    };
    fetch();
  }, [product.id]);

  const currentFinal = finalPrice(product);
  const cheapestSame = [...sameName].sort((a, b) => finalPrice(a) - finalPrice(b))[0];
  const cheapestAlt = [...alternatives].sort((a, b) => finalPrice(a) - finalPrice(b))[0];

  const renderRow = (p: Product) => {
    const fp = finalPrice(p);
    const isCheapest = sameName.length > 0 && fp === finalPrice(cheapestSame as Product);
    return (
      <div
        key={p.id}
        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all hover:shadow-md ${
          isCheapest ? 'bg-teal-50/60 border-teal-200' : 'bg-white border-gray-100'
        }`}
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
          {p.image_url ? (
            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Pill className="w-6 h-6 text-gray-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900 truncate">{p.name}</p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
            <Store className="w-3 h-3 shrink-0" style={{ color: themeColors.priceColor }} />
            <span className="truncate">{p.pharmacy?.name || 'جميع الصيدليات'}</span>
          </p>
        </div>
        <div className="text-left shrink-0">
          <p className="text-base font-black" style={{ color: themeColors.priceColor }}>
            {fp.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">ج.م</span>
          </p>
          {p.discounts?.some((d) => d.is_active) && (
            <p className="text-[10px] text-gray-400 line-through">{p.price.toFixed(2)}</p>
          )}
        </div>
        <button
          onClick={() => {
            if (storeConfig.purchasesEnabled) {
              addToCart(p, p.pharmacy?.name);
              onClose();
              openCart('cart');
            } else {
              openOrder(p, p.pharmacy?.name);
            }
          }}
          className="shrink-0 px-3 py-1.5 rounded-xl text-white text-[11px] font-extrabold hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-1.5"
          style={{ backgroundColor: themeColors.priceColor }}
        >
          {storeConfig.purchasesEnabled ? (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              أضف للسلة
            </>
          ) : (
            <>
              <Phone className="w-3.5 h-3.5" />
              تواصل
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 backdrop-blur-sm px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10 rounded-t-3xl"
          style={{ backgroundColor: themeColors.modalHeaderBg }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${themeColors.priceColor}12`, color: themeColors.priceColor }}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black" style={{ color: themeColors.modalHeaderText }}>قارن الأسعار</h2>
              <p className="text-[11px] font-bold truncate max-w-[220px] sm:max-w-sm" style={{ color: themeColors.modalBodyText }}>{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ color: themeColors.modalHeaderText }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Current product */}
          <div className="rounded-2xl border-2 p-4 flex items-center gap-3" style={{ borderColor: `${themeColors.priceColor}30`, backgroundColor: themeColors.cardBg }}>
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
              {product.image_url ? (
                <img src={product.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Pill className="w-7 h-7 text-gray-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900">السعر الحالي</p>
              <p className="text-[11px] text-gray-500 font-bold">{product.pharmacy?.name || 'جميع الصيدليات'}</p>
            </div>
            <div className="text-left shrink-0">
              <p className="text-lg font-black" style={{ color: themeColors.priceColor }}>
                {currentFinal.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">ج.م</span>
              </p>
              {product.discounts?.some((d) => d.is_active) && (
                <p className="text-[10px] text-gray-400 line-through">{product.price.toFixed(2)}</p>
              )}
            </div>
          </div>

          {/* Same product in other pharmacies */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : sameName.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${themeColors.priceColor}12` }}>
                  <Store className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                </div>
                <h3 className="text-sm font-black text-gray-900">نفس الدواء في صيدليات أخرى ({sameName.length})</h3>
                {cheapestSame && (
                  <span className="mr-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[10px] font-extrabold text-teal-700">
                    <TrendingDown className="w-3 h-3" />
                    الأرخص {finalPrice(cheapestSame).toFixed(2)} ج.م
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {[...sameName]
                  .sort((a, b) => finalPrice(a) - finalPrice(b))
                  .map(renderRow)}
              </div>
            </section>
          ) : (
            !product.for_all_pharmacies && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-black text-gray-500">لا توجد صيدليات أخرى توفر نفس الدواء حالياً</h3>
                </div>
              </section>
            )
          )}

          {/* Alternatives with same active ingredient */}
          {!loading && alternatives.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${themeColors.accentColor}12` }}>
                  <Sparkles className="w-4 h-4" style={{ color: themeColors.accentColor }} />
                </div>
                <h3 className="text-sm font-black text-gray-900">بدائل بنفس المادة الفعالة ({alternatives.length})</h3>
                {cheapestAlt && (
                  <span className="mr-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-extrabold text-amber-700">
                    <CheckCircle2 className="w-3 h-3" />
                    البديل الأرخص {finalPrice(cheapestAlt).toFixed(2)} ج.م
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mb-3 font-bold">
                بدائل تحتوي على نفس المادة الفعالة "{product.active_ingredient}" — استشر الصيدلي قبل التبديل.
              </p>
              <div className="space-y-2">
                {[...alternatives]
                  .sort((a, b) => finalPrice(a) - finalPrice(b))
                  .map(renderRow)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
