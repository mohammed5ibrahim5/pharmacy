import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Pill,
  AlertCircle,
  CheckCircle2,
  Store,
  Truck,
  FlaskConical,
  Package,
  Barcode,
  Tag,
  ShoppingCart,
  ClipboardList,
  ShieldAlert,
  ArrowLeftRight,
  Flame,
  CalendarClock,
  Sparkles
} from 'lucide-react';
import type { Product, Discount } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useOrder } from '@/context/OrderContext';
import { useLanguage } from '@/context/LanguageContext';
import { SubstitutesModal } from '@/components/SubstitutesModal';
import { SubscribeModal } from '@/components/SubscribeModal';
import { DoseGuideSection } from '@/components/DoseGuideSection';
import { DoseCalculatorModal } from '@/components/DoseCalculatorModal';
import { InventoryFreshness } from '@/components/InventoryFreshness';

interface Props {
  product: Product | null;
  pharmacyName?: string;
  onClose: () => void;
}

export function QuickViewModal({ product, pharmacyName, onClose }: Props) {
  const { t, lang } = useLanguage();
  const { themeColors, subscriptionConfig } = useSettings();
  const { addToCart, cart } = useOrder();
  const [justAdded, setJustAdded] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorKey, setCalculatorKey] = useState<string | undefined>(undefined);

  /* قفل سكرول الصفحة والمودال مفتوح */
  useEffect(() => {
    if (!product) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [product]);

  const cartEntry = product ? cart.find((i) => i.product.id === product.id) : undefined;
  const inCart = !!cartEntry || justAdded;

  if (!product) return null;

  const name = lang === 'en' ? (product.name_en || product.name) : product.name;
  const activeDiscount = product.discounts?.find((d: Discount) => d.is_active);
  const finalPrice = activeDiscount
    ? product.price * (1 - activeDiscount.discount_percentage / 100)
    : product.price;

  const handleAdd = () => {
    const ok = addToCart(product, pharmacyName);
    if (!ok) return;
    setJustAdded(true);
  };

  const facts: { label: string; value: string; icon: typeof Package; ltr?: boolean }[] = [];
  if (product.active_ingredient) facts.push({ label: t('المادة الفعالة'), value: t(product.active_ingredient), icon: FlaskConical });
  if (product.manufacturer) facts.push({ label: t('الشركة المصنعة'), value: t(product.manufacturer), icon: Package });
  if (product.form || product.dosage) facts.push({ label: t('الشكل والتركيز'), value: [product.form, product.dosage].filter((x): x is string => !!x).map((x) => t(x)).join(' • '), icon: FlaskConical });
  if (product.barcode) facts.push({ label: t('الباركود'), value: product.barcode, icon: Barcode, ltr: true });
  facts.push({ label: t('وحدة البيع'), value: t(product.unit), icon: Tag });
  const sections: { title: string; body: string; icon: typeof ClipboardList; color: string }[] = [];
  if (product.how_to_use) sections.push({ title: t('طريقة الاستخدام'), body: t(product.how_to_use), icon: ClipboardList, color: '#0d9488' });
  if (product.contraindications) sections.push({ title: t('موانع الاستخدام'), body: t(product.contraindications), icon: ShieldAlert, color: '#e11d48' });
  if (product.interactions) sections.push({ title: t('التفاعلات الدوائية'), body: t(product.interactions), icon: ArrowLeftRight, color: '#d97706' });

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8"
    >
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-fade-in"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      />
      <div
        className="relative z-10 bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 end-3 z-20 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label={t('إغلاق')}
          >
            <X className="w-4.5 h-4.5" />
          </button>
          {requiresRx(product) && (
            <span className="absolute top-3 start-3 z-20 bg-amber-500 text-white px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow">
              <AlertCircle className="w-3.5 h-3.5" />
              {t('يحتاج وصفة طبية')}
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row overflow-y-auto">
          {/* Image side */}
          <div className="md:w-[42%] shrink-0 bg-gray-50 relative flex items-center justify-center p-8 min-h-[260px] border-b md:border-b-0 md:border-e border-gray-100">
            {activeDiscount && (
              <span className="absolute top-4 start-4 px-3 py-1 rounded-full text-[11px] font-black text-white shadow-md inline-flex items-center gap-1"
                style={{ background: 'linear-gradient(135deg,#ef4444,#f43f5e)' }}>
                <Flame className="w-3 h-3" />
                {t('وفر {0}%', [activeDiscount.discount_percentage])}
              </span>
            )}
            {product.image_url ? (
              <img src={product.image_url} alt={name} className="max-h-80 w-auto object-contain drop-shadow-lg" />
            ) : (
              <div
                className="w-full aspect-square max-w-[240px] rounded-3xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${themeColors.priceColor}12, ${themeColors.primaryColor}18)` }}
              >
                <Pill className="w-20 h-20" style={{ color: themeColors.priceColor, opacity: 0.45 }} />
              </div>
            )}
          </div>

          {/* Content side */}
          <div className="flex-1 min-w-0 p-6 sm:p-7 space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black leading-snug text-gray-900">{name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {product.is_available ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                    style={{ color: themeColors.inStockColor, backgroundColor: `${themeColors.inStockColor}14` }}>
                    <CheckCircle2 className="w-3 h-3" />
                    {t('متاح')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    <AlertCircle className="w-3 h-3" />
                    {t('نفدت الكمية')}
                  </span>
                )}
                {product.is_controlled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                    {t('مراقب — غير متاح للبيع عبر الإنترنت')}
                  </span>
                )}
                {typeof product.stock_quantity === 'number' && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 animate-pulse">
                    <Flame className="w-3 h-3" />
                    {t('باقي {0} قطع', [product.stock_quantity])}
                  </span>
                )}
                {cartEntry && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <ShoppingCart className="w-3 h-3" />
                    {t('في السلة')}
                    <span className="min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">
                      {cartEntry.quantity}
                    </span>
                  </span>
                )}
              </div>
              <div className="mt-2">
                <InventoryFreshness updatedAt={product.updated_at} />
              </div>
              <p className="mt-1.5 text-xs font-bold text-gray-500 flex items-center gap-1.5">
                {product.for_all_pharmacies ? (
                  <>
                    <Store className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
                    {t('جميع الصيدليات')}
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
                    {pharmacyName || product.pharmacy?.name || '—'}
                  </>
                )}
              </p>
            </div>

            {product.is_controlled && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-relaxed text-rose-900">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t('دواء مراقب: متاح للمعلومات فقط ولا يمكن إضافته إلى السلة أو طلبه عبر الإنترنت.')}</p>
              </div>
            )}

            {/* Price + CTA */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 flex items-center justify-between gap-3">
              <div>
                {activeDiscount && (
                  <span className="block text-xs line-through font-medium text-gray-400">{product.price.toFixed(2)} EGP</span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black" style={{ color: activeDiscount ? '#ef4444' : themeColors.priceColor }}>
                    {finalPrice.toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-gray-500">EGP</span>
                </div>
              </div>
              {!product.is_controlled && <button
                type="button"
                onClick={handleAdd}
                disabled={!product.is_available}
                className={`relative flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${inCart ? 'brightness-105' : ''}`}
                style={{
                  background: inCart
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : `linear-gradient(135deg, ${themeColors.priceColor}, ${themeColors.primaryColor})`,
                  boxShadow: inCart
                    ? '0 6px 16px -4px rgba(16,185,129,0.5)'
                    : `0 6px 16px -4px ${themeColors.priceColor}66`,
                }}
              >
                {inCart ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                {inCart ? t('تمت الإضافة ✓') : t('أضف إلى السلة')}
              </button>}
            </div>

            {subscriptionConfig.enabled && product.is_available && !product.requires_prescription && !product.is_controlled && (
              <button
                type="button"
                onClick={() => setSubscribeOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all active:scale-98 shadow-xs"
                style={{ color: themeColors.primaryColor, border: `1px solid ${themeColors.primaryColor}35` }}
              >
                <CalendarClock className="w-4 h-4" />
                <span>{t('اشترك شهرياً — وفر {0}%', [subscriptionConfig.discountPercent ?? 5])}</span>
              </button>
            )}

            {/* Substitutes Button */}
            {!product.is_controlled && <button
              type="button"
              onClick={() => setSubsOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100/70 text-teal-800 text-xs font-black transition-all active:scale-98 shadow-xs"
            >
              <ArrowLeftRight className="w-4 h-4 text-teal-600" />
              <span>{t('عرض منتجات تشترك في المادة الفعالة')}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </button>}

            {/* Facts grid */}
            <div className="grid sm:grid-cols-2 gap-2">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start gap-2.5 rounded-xl border border-gray-100 px-3 py-2">
                  <f.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: themeColors.priceColor }} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gray-400">{f.label}</p>
                    <p className="text-xs font-bold text-gray-800 break-words" dir={f.ltr ? 'ltr' : undefined}>{f.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: themeColors.priceColor }}>{t('عن الدواء')}</p>
                <p className="text-xs font-semibold text-gray-700 leading-relaxed whitespace-pre-line">{t(product.description)}</p>
              </div>
            )}

            {/* Usage / warnings accordions */}
            {sections.length > 0 && (
              <div className="space-y-1.5">
                {sections.map((s) => (
                  <details key={s.title} className="group rounded-xl border border-gray-150 overflow-hidden open:bg-white" style={{ borderColor: '#e7e5e4' }}>
                    <summary className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                      <s.icon className="w-4 h-4 shrink-0" style={{ color: s.color }} />
                      <span className="text-xs font-extrabold text-gray-800 flex-1">{s.title}</span>
                      <Chevron className="w-3.5 h-3.5 text-gray-300 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="px-3.5 pb-3 pt-0 text-xs font-semibold text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
                  </details>
                ))}
              </div>
            )}

            {/* Dose guide */}
            <DoseGuideSection
              product={product}
              onOpenCalculator={(key) => {
                setCalculatorKey(key);
                setCalculatorOpen(true);
              }}
            />

            {/* Quantity hint */}
            {!product.is_available && (
              <p className="text-[11px] font-bold text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {t('هذا المنتج غير متاح حالياً — فعّل تنبيه التوفر من بطاقة المنتج')}
              </p>
            )}
          </div>
        </div>
      </div>
      {subsOpen && <SubstitutesModal product={product} onClose={() => setSubsOpen(false)} />}
      {subscribeOpen && <SubscribeModal product={product} pharmacyName={pharmacyName} onClose={() => setSubscribeOpen(false)} />}
      {calculatorOpen && (
        <DoseCalculatorModal
          initialKey={calculatorKey}
          onClose={() => setCalculatorOpen(false)}
        />
      )}
    </div>,
    document.body
  );
}

function requiresRx(product: Product): boolean {
  return !!product.requires_prescription;
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
