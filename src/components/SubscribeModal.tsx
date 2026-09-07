import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarClock, Minus, Plus, Truck, BadgePercent, ShieldCheck, CheckCircle2, Store, PackageCheck, Wallet } from 'lucide-react';
import type { Product, Discount } from '@/types';
import type { SubscriptionProduct } from '@/lib/subscriptions';
import { baseProductPrice, addSubscription } from '@/lib/subscriptions';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from '@/context/RouterContext';

interface Props {
  product: Product;
  pharmacyName?: string;
  onClose: () => void;
}

export function SubscribeModal({ product, pharmacyName, onClose }: Props) {
  const { t, lang } = useLanguage();
  const { themeColors, subscriptionConfig } = useSettings();
  const { user, setAuthModalOpen } = useCustomer();
  const { navigate } = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'vodafone_cash' | 'instapay'>('cash_on_delivery');
  const [reminderDays, setReminderDays] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const subProduct: SubscriptionProduct = {
    id: product.id,
    name: product.name,
    name_en: product.name_en,
    price: product.price,
    unit: product.unit,
    image_url: product.image_url,
    for_all_pharmacies: product.for_all_pharmacies,
    discounts: product.discounts as SubscriptionProduct['discounts'],
  };

  const base = baseProductPrice(subProduct);
  const discountPercent = subscriptionConfig.discountPercent ?? 5;
  const perUnit = base * (1 - discountPercent / 100);
  const monthlyTotal = perUnit * quantity;
  const name = lang === 'en' ? (product.name_en || product.name) : product.name;

  const handleSubmit = async () => {
    if (!user) {
      setAuthModalOpen(true);
      onClose();
      return;
    }
    if (!address.trim()) {
      setError(t('يرجى إدخال عنوان الاستلام لتجديد الطلب شهرياً.'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await addSubscription({
      customerId: user.id,
      productId: product.id,
      pharmacyId: product.pharmacy_id || null,
      quantity,
      address,
      note: note || undefined,
      intervalDays: 30,
      paymentMethod,
      renewalReminderDays: reminderDays,
    });
    setSubmitting(false);
    if (err) {
      setError(t('تعذر إنشاء الاشتراك، برجاء المحاولة مرة أخرى.'));
      return;
    }
    setDone(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative z-10 bg-white w-full max-w-md max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-fade-up" dir="rtl">
        {!done ? (
          <>
            {/* Header */}
            <div className="relative shrink-0 px-6 pt-6 pb-5" style={{ background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}>
              <button
                onClick={onClose}
                className="absolute top-4 end-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              <div className="flex items-center gap-3">
                {product.image_url ? (
                  <img src={product.image_url} alt={name} className="w-16 h-16 rounded-2xl object-contain bg-white p-1.5 shadow-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
                    <CalendarClock className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white truncate">{t('اشترك شهرياً')}</h2>
                  <p className="text-xs font-bold text-white/85 truncate">{name}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* المزايا */}
              <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-teal-800">
                  <CalendarClock className="w-4 h-4 text-teal-600" />
                  {t('يتجدد تلقائياً كل شهر')}
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                  <BadgePercent className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                  {t('خصم دائم {0}% على كل تجديد', [discountPercent])}
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  {t('يمكنك إيقافه أو إلغاؤه في أي وقت')}
                </div>
              </div>

              {/* الكمية */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-500">{t('الكمية شهرياً')}</p>
                  <p className="text-[11px] font-bold text-slate-400">{t(product.unit)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="min-w-[2.5rem] text-center text-lg font-black" style={{ color: themeColors.priceColor }}>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-xl text-white flex items-center justify-center transition-all active:scale-90"
                    style={{ backgroundColor: themeColors.priceColor }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* السعر المحسوب */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>{t('السعر للوحدة')}</span>
                  <span className="flex items-center gap-2">
                    <span className="line-through">{base.toFixed(2)} EGP</span>
                    <span className="font-black" style={{ color: themeColors.priceColor }}>{perUnit.toFixed(2)} EGP</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>{t('الإجمالي الشهري')}</span>
                  <span className="font-black text-sm text-slate-800">{monthlyTotal.toFixed(2)} EGP</span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1 pt-1">
                  <Truck className="w-3.5 h-3.5" />
                  {t('التوصيل ورسوم الدفع عند الاستلام تُحسب عند التجديد')}
                </p>
                {!product.for_all_pharmacies && pharmacyName && (
                  <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
                    {pharmacyName}
                  </p>
                )}
              </div>

              {/* العنوان */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">{t('عنوان الاستلام')} *</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder={t('المنطقة، الشارع، رقم العمارة، الشقة...')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow resize-none"
                  style={{ ['--tw-ring-color' as never]: `${themeColors.primaryColor}55` }}
                />
              </div>

              {/* ملاحظات */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">{t('ملاحظات (اختياري)')}</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('مثال: يرجى تسليم العبوة كاملة')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow"
                  style={{ ['--tw-ring-color' as never]: `${themeColors.primaryColor}55` }}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-xs font-black text-slate-600">{t('وسيلة الدفع عند التجديد')}
                  <span className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5"><Wallet className="w-4 h-4 text-slate-400" /><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className="w-full bg-transparent text-xs font-bold focus:outline-none"><option value="cash_on_delivery">{t('الدفع عند الاستلام')}</option><option value="vodafone_cash">{t('فودافون كاش')}</option><option value="instapay">{t('انستا باي')}</option></select></span>
                </label>
                <label className="block text-xs font-black text-slate-600">{t('التذكير قبل التجديد')}
                  <select value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold focus:outline-none"><option value={0}>{t('يوم التجديد')}</option><option value={1}>{t('قبل يوم')}</option><option value={3}>{t('قبل 3 أيام')}</option><option value={7}>{t('قبل أسبوع')}</option></select>
                </label>
              </div>

              {error && (
                <p className="text-xs font-black text-red-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}
            </div>

            <div className="shrink-0 p-6 pt-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-black shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${themeColors.priceColor}, ${themeColors.primaryColor})`, boxShadow: `0 10px 24px -8px ${themeColors.priceColor}66` }}
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CalendarClock className="w-4 h-4" />
                )}
                {submitting ? t('جاري إنشاء الاشتراك...') : t('اشترك الآن — شهرياً')}
              </button>
              <p className="mt-2.5 text-center text-[11px] font-bold text-slate-400">
                {t('الدفع عند الاستلام • يمكنك الإلغاء في أي وقت من صفحة اشتراكاتك')}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-emerald-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-xl font-black text-slate-900">{t('تم تفعيل اشتراكك!')}</h2>
              <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                {t('سيتجدد طلبك من {0} تلقائياً كل شهر بخصم {1}%، وسنخبرك قبل كل تجديد. يمكنك مراجعة أو إيقاف الاشتراك في أي وقت.', [name, discountPercent])}
              </p>
              <div className="flex items-center justify-center gap-2 text-xs font-black text-teal-700 bg-teal-50 border border-teal-100 rounded-2xl py-3">
                <PackageCheck className="w-4 h-4" />
                {t('أول تجديد بعد 30 يوماً')}
              </div>
            </div>
            <div className="shrink-0 p-6 pt-0 space-y-2.5">
              <button
                type="button"
                onClick={() => navigate({ name: 'account', tab: 'subscriptions' })}
                className="w-full py-3.5 rounded-2xl text-white font-black shadow-lg transition-all active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${themeColors.priceColor}, ${themeColors.primaryColor})` }}
              >
                {t('إدارة اشتراكاتي')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black transition-colors"
              >
                {t('إغلاق')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}