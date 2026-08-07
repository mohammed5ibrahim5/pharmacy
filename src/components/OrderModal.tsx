import { useState, useEffect, useMemo } from 'react';
import {
  X, ShoppingBag, Lock, CheckCircle2, AlertCircle, Loader2, MapPin, User, Phone,
  Send, Info, Store, Wallet, Copy, CheckCheck, Camera, Trash2, Smartphone, Landmark,
  Link2, Truck, Sparkles, Plus, Minus, ShoppingCart, Building2,
} from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useCustomer } from '@/context/CustomerContext';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';
import { awardLoyaltyPoints } from '@/lib/loyalty';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  uploadPaymentScreenshot,
  type PaymentMethod,
} from '@/lib/orders';
import type { Pharmacy, Product } from '@/types';

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  vodafone_cash: <Smartphone className="w-5 h-5" />,
  instapay: <Landmark className="w-5 h-5" />,
};

interface CartGroup {
  key: string;
  label: string;
  pharmacy: Pharmacy | null;
  subtotal: number;
}

function finalPriceOf(product: Product): number {
  const activeDiscount = product.discounts?.find((d) => d.is_active);
  return activeDiscount
    ? product.price * (1 - activeDiscount.discount_percentage / 100)
    : product.price;
}

export function OrderModal() {
  const { cart, cartOpen, cartStep, setCartStep, closeCart, updateCartQty, removeFromCart, clearCart } = useOrder();
  const { user, profile, setAuthModalOpen } = useCustomer();
  const { settings, themeColors, paymentConfig, storeConfig, loyaltyConfig } = useSettings();
  const { t, lang } = useLanguage();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [address, setAddress] = useState(profile?.phone || '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vodafone_cash');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotLinkMode, setScreenshotLinkMode] = useState(false);
  const [screenshotLinkValue, setScreenshotLinkValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cartOpen) return;
    let cancelled = false;
    const loadPharmacies = async () => {
      const { data } = await supabase.from('pharmacies').select('*').order('name');
      if (!cancelled) setPharmacies((data || []) as Pharmacy[]);
    };
    loadPharmacies();
    return () => {
      cancelled = true;
    };
  }, [cartOpen]);

  useEffect(() => {
    if (!cartOpen) return;
    setAddress(profile?.phone || '');
    setNote('');
    setScreenshot(null);
    setScreenshotLinkMode(false);
    setScreenshotLinkValue('');
    setError(null);
    setSuccess(false);
    setCopied(false);
  }, [cartOpen, profile?.phone, cartStep]);

  const groups = useMemo(() => {
    const map = new Map<string, CartGroup>();
    cart.forEach((entry) => {
      const p = entry.product;
      const key = p.for_all_pharmacies ? '__all__' : p.pharmacy_id || '__all__';
      if (!map.has(key)) {
        const pharmacy = p.for_all_pharmacies
          ? null
          : pharmacies.find((ph) => ph.id === p.pharmacy_id) || null;
        map.set(key, {
          key,
          label: p.for_all_pharmacies
            ? t('متوفر لدى جميع الصيدليات')
            : pharmacy?.name || entry.pharmacyName || p.pharmacy?.name || t('الصيدلية'),
          pharmacy,
          subtotal: 0,
        });
      }
      const group = map.get(key)!;
      const price = finalPriceOf(p) * entry.quantity;
      group.subtotal += price;
    });
    return Array.from(map.values());
  }, [cart, pharmacies, t]);

  const subtotal = cart.reduce((sum, entry) => sum + finalPriceOf(entry.product) * entry.quantity, 0);
  const freeThreshold = parseFloat(paymentConfig.freeDeliveryThreshold) || 0;
  const defaultFee = parseFloat(paymentConfig.deliveryFee) || 0;
  const deliveryFreeGlobal = freeThreshold > 0 && subtotal >= freeThreshold;

  const groupFee = (g: CartGroup): number => {
    if (g.key === '__all__') return 0;
    if (deliveryFreeGlobal) return 0;
    if (g.pharmacy?.delivery_available === false) return 0;
    return g.pharmacy ? (g.pharmacy.delivery_fee ?? defaultFee) : defaultFee;
  };

  const totalDelivery = groups.reduce((sum, g) => sum + groupFee(g), 0);
  const total = subtotal + totalDelivery;

  const methodNumber = paymentMethod === 'vodafone_cash' ? paymentConfig.vodafoneCash : paymentConfig.instapay;
  const hasMethodNumber = Boolean(methodNumber.trim());

  if (!cartOpen) return null;

  const catalogMode = !storeConfig.purchasesEnabled;
  const whatsappDigits = settings.contact_whatsapp ? settings.contact_whatsapp.replace(/\D/g, '') : null;
  const contactPhone = settings.contact_phone || null;

  const buildWhatsAppMessage = () => {
    const lines: string[] = [];
    lines.push(t('مرحباً، أود طلب هذه الأدوية من صيدليتكم:'));
    groups.forEach((g) => {
      const entries = cart.filter((e) =>
        e.product.for_all_pharmacies ? g.key === '__all__' : e.product.pharmacy_id === g.key
      );
      if (entries.length === 0) return;
      lines.push(`• ${g.label}`);
      entries.forEach((entry) => {
        lines.push(`    ${entry.product.name} × ${entry.quantity}`);
      });
    });
    lines.push('');
    lines.push(`${t('الاسم:')} ${profile?.full_name || ''}`);
    lines.push(`${t('الهاتف:')} ${profile?.phone || ''}`);
    if (note.trim()) lines.push(`${t('ملاحظات:')} ${note.trim()}`);
    return lines.join('\n');
  };

  const closeModal = () => {
    if (!loading) closeCart();
  };

  // ============ Empty cart ============
  if (cart.length === 0 && !success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeModal}>
        <div className="rounded-3xl w-full max-w-md p-8 text-center relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
          <button onClick={closeModal} className="absolute top-4 end-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 relative"
            style={{ backgroundColor: `${themeColors.priceColor}10`, color: themeColors.priceColor }}
          >
            <ShoppingCart className="w-9 h-9" />
            <span
              className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center"
              style={{ color: themeColors.accentColor }}
            >
              <Plus className="w-3 h-3" strokeWidth={3} />
            </span>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">{t('سلة التسوق فارغة')}</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            {catalogMode
              ? t('لم تضف أي منتجات بعد. أضف أدويتك إلى السلة ثم أرسل طلبك إلى الصيدلية واتساب.')
              : t('لم تضف أي منتجات بعد. تصفح الصيدليات وأضف أدويتك إلى سلة التسوق لتدفعها كلها في طلب واحد بتوصيلة واحدة.')}
          </p>
          <button
            onClick={closeModal}
            className="w-full py-3.5 rounded-2xl text-white font-black transition-all hover:brightness-105 active:scale-[0.99] shadow-lg"
            style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
          >
            {t('ابدأ التسوق')}
          </button>        </div>
      </div>
    );
  }

  // ============ Success ============
  if (success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeModal}>
        <div className="rounded-3xl w-full max-w-md p-8 text-center relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
          <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">{t('تم استلام طلبك بنجاح!')}</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-3">
            {t('سنراجع إثبات التحويل الخاص بك، وبمجرد تأكيد الدفع ستصل إليك رسالة بأن طلبك في الطريق.')}
          </p>
          {groups.length > 1 && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-teal-700 mb-4">
              <Building2 className="w-4 h-4 shrink-0" />
              {t('طلبك موحّد من {0} صيدليات في توصيلة واحدة.', [groups.length])}
            </div>
          )}
          {loyaltyConfig.enabled && loyaltyConfig.pointsPerOrder > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-amber-700 mb-4">
              <Sparkles className="w-4 h-4 shrink-0" />
              {t('حصلت على {0} نقطة مكافأة أُضيفت لرصيدك!', [loyaltyConfig.pointsPerOrder])}
            </div>
          )}
          <button
            onClick={() => {
              clearCart();
              closeCart();
            }}
            className="w-full py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: themeColors.priceColor }}
          >
            {t('حسناً')}
          </button>
        </div>
      </div>
    );
  }

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(t('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(methodNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!user) {
      setError(t('يرجى تسجيل الدخول أولاً لإتمام الطلب.'));
      setLoading(false);
      return;
    }
    if (!hasMethodNumber) {
      setError(t('لم يتم إعداد رقم الدفع من الإدارة بعد، يرجى المحاولة لاحقاً.'));
      setLoading(false);
      return;
    }
    if (!screenshot) {
      setError(t('يرجى رفع صورة إثبات التحويل (سكرين شوت) حتى يتم تأكيد الطلب.'));
      setLoading(false);
      return;
    }

    try {
      const screenshotUrl = screenshot.startsWith('data:') ? await uploadPaymentScreenshot(screenshot) : screenshot;
      const { data: groupData, error: groupErr } = await supabase
        .from('order_groups')
        .insert({
          customer_id: user.id,
          address: address || null,
          note: note || null,
          status: 'pending',
          payment_method: paymentMethod,
          payment_number: methodNumber,
          payment_screenshot_url: screenshotUrl,
          delivery_fee: totalDelivery,
          total_price: total,
        })
        .select('id')
        .single();
      if (groupErr) {
        setError(localizedError(groupErr.message, lang));
        setLoading(false);
        return;
      }

      const rows = cart.map((entry) => {
        const price = finalPriceOf(entry.product) * entry.quantity;
        return {
          customer_id: user.id,
          product_id: entry.product.id,
          pharmacy_id: entry.product.pharmacy_id || null,
          quantity: entry.quantity,
          total_price: price,
          address: address || null,
          note: note || null,
          status: 'pending' as const,
          payment_method: paymentMethod,
          payment_number: methodNumber,
          payment_screenshot_url: screenshotUrl,
          order_group_id: groupData.id,
        };
      });

      const { error: err } = await supabase.from('orders').insert(rows);
      if (err) {
        setError(localizedError(err.message, lang));
      } else {
        const earnedPoints = loyaltyConfig.enabled ? loyaltyConfig.pointsPerOrder : 0;
        if (earnedPoints > 0) {
          const { data: customer } = await supabase.from('customers').select('loyalty_points').eq('id', user.id).maybeSingle();
          const current = Number((customer as { loyalty_points?: number } | null)?.loyalty_points || 0);
          await awardLoyaltyPoints(user.id, current + earnedPoints, t('مكافأة طلب موحّد من {0} صيدلية', [groups.length]));
        }
        setSuccess(true);
      }
    } catch {
      setError(t('فشل رفع صورة التحويل، برجاء المحاولة مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  // ============ Cart step ============
  if (cartStep === 'cart') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeModal}>
        <div className="rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0" style={{ backgroundColor: themeColors.modalHeaderBg }}>
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${themeColors.priceColor}14`, color: themeColors.priceColor }}
              >
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-gray-900">{t('سلة التسوق')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('{0} منتج من {1} {2} · توصيلة واحدة', [cart.reduce((s, i) => s + i.quantity, 0), groups.length, groups.length === 1 ? t('صيدلية') : t('صيدليات')])}
                </p>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center shrink-0">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] font-black text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: themeColors.priceColor }}>1</span>
              <span className="text-[10px] font-bold text-gray-600">{t('السلة')}</span>
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-[10px] font-black text-gray-400 w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center">2</span>
              <span className="text-[10px] font-bold text-gray-400">{catalogMode ? t('إرسال الطلب') : t('الدفع والتوصيل')}</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="font-bold text-sm text-red-700">{error}</p>
              </div>
            )}

            {groups.map((g) => (
              <div key={g.key} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-gray-100" style={{ backgroundColor: `${themeColors.priceColor}08` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: themeColors.cardBg }}>
                    <Store className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                  </div>
                  <p className="text-[13px] font-extrabold text-gray-800 flex-1 truncate">{g.label}</p>
                  {g.key !== '__all__' && g.pharmacy?.delivery_available !== false && (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${groupFee(g) === 0 ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {groupFee(g) === 0 ? t('توصيل مجاني') : t('توصيل {0} ج.م', [groupFee(g).toFixed(0)])}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {cart
                    .filter((e) => (e.product.for_all_pharmacies ? g.key === '__all__' : e.product.pharmacy_id === g.key))
                    .map((entry) => {
                      const price = finalPriceOf(entry.product);
                      return (
                        <div key={entry.key} className="flex items-center gap-3 p-3">
                          {entry.product.image_url ? (
                            <img src={entry.product.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                              <ShoppingBag className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 truncate">{entry.product.name}</p>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">{entry.product.unit || t('قطعة')} · {t('{0} ج.م', [price.toFixed(2)])}</p>
                            <p className="text-sm font-extrabold mt-1" style={{ color: themeColors.priceColor }}>
                              {(price * entry.quantity).toFixed(2)} <span className="text-[10px] text-gray-400 font-medium">{t('ج.م')}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm">
                              <button
                                onClick={() => updateCartQty(entry.key, entry.quantity - 1)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                                aria-label={t('إنقاص الكمية')}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-7 text-center font-bold text-sm text-gray-800">{entry.quantity}</span>
                              <button
                                onClick={() => updateCartQty(entry.key, entry.quantity + 1)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-all active:scale-90"
                                style={{ backgroundColor: themeColors.priceColor }}
                                aria-label={t('زيادة الكمية')}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(entry.key)}
                              className="text-[10px] font-bold text-gray-400 hover:text-red-500 flex items-center gap-0.5 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> {t('إزالة')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{t('المجموع الفرعي')}</span>
                <span className="font-bold text-gray-800">{t('{0} ج.م', [subtotal.toFixed(2)])}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> {t('رسوم التوصيل')}
                </span>
                <span className={`font-bold ${totalDelivery === 0 ? 'text-teal-600' : 'text-gray-800'}`}>
                  {totalDelivery === 0 ? (deliveryFreeGlobal ? t('مجاني') : t('بدون رسوم')) : t('{0} ج.م', [totalDelivery.toFixed(0)])}
                </span>
              </div>
              {freeThreshold > 0 && subtotal < freeThreshold && (
                <div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (subtotal / freeThreshold) * 100)}%`, backgroundColor: themeColors.priceColor }}
                    />
                  </div>
                  <p className="text-[11px] text-teal-600 font-bold">
                    {t('أضف {0} ج.م ليصبح التوصيل مجانياً!', [(freeThreshold - subtotal).toFixed(2)])}
                  </p>
                </div>
              )}
              {paymentConfig.shippingNote && (
                <p className="text-[11px] text-gray-400 leading-relaxed flex items-start gap-1 pt-1 border-t border-gray-100">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  {t(paymentConfig.shippingNote)}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 pt-3 border-t border-gray-100 shrink-0" style={{ backgroundColor: themeColors.modalHeaderBg }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500">{t('الإجمالي')}</span>
              <span className="font-black text-xl" style={{ color: themeColors.priceColor }}>
                {total.toFixed(2)} <span className="text-xs text-gray-400 font-medium">{t('ج.م')}</span>
              </span>
            </div>
            {catalogMode ? (
              <>
                {whatsappDigits ? (
                  <a
                    href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(buildWhatsAppMessage())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-[15px] transition-all hover:brightness-105 active:scale-[0.99] shadow-lg"
                    style={{ backgroundColor: '#25d366', boxShadow: '0 8px 20px -6px #25d36688' }}
                  >
                    <Send className="w-5 h-5" />
                    {t('إرسال الطلب واتساب')}
                  </a>
                ) : contactPhone ? (
                  <a
                    href={`tel:${contactPhone}`}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-[15px] transition-all hover:brightness-105 active:scale-[0.99] shadow-lg"
                    style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
                  >
                    <Phone className="w-5 h-5" />
                    {t('الاتصال المباشر')}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-200 text-gray-400 font-black text-[15px] cursor-not-allowed"
                  >
                    {t('لا يتوفر رقم تواصل مسجل حالياً، حاول لاحقاً.')}
                  </button>
                )}
                <p className="text-[11px] text-gray-400 text-center leading-relaxed mt-2.5 flex items-center justify-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  {t('بدون دفع مسبق — أرسل قائمتك للصيدلية وسيتواصل معك الصيدلي.')}
                </p>
              </>
            ) : (
              <button
                onClick={() => {
                  if (!user) {
                    closeCart();
                    setAuthModalOpen(true);
                    return;
                  }
                  setCartStep('checkout');
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-[15px] transition-all hover:brightness-105 active:scale-[0.99] shadow-lg"
                style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
              >
                <Send className="w-5 h-5" />
                {t('متابعة إتمام الطلب')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ Checkout step ============
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeModal}>
      <div className="rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
        <button onClick={closeModal} className="absolute top-4 end-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCartStep('cart')}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
              title={t('العودة للسلة')}
            >
              <X className="w-4 h-4 rotate-45" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-gray-900">{t('إتمام الطلب')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('طلب من {0} {1} في توصيلة واحدة', [groups.length, groups.length === 1 ? t('صيدلية') : t('صيدليات')])}</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-[10px] font-black text-white w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: themeColors.priceColor }}>
              <CheckCheck className="w-3 h-3" />
            </span>
            <span className="text-[10px] font-bold text-gray-600">{t('السلة')}</span>
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-[10px] font-black text-white w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: themeColors.priceColor }}>2</span>
            <span className="text-[10px] font-bold text-gray-600">{t('الدفع والتوصيل')}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-gradient-to-bl from-red-50 to-orange-50 p-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-red-700 mb-0.5">{error}</p>
                <p className="text-xs text-red-600/80 flex items-start gap-1 leading-relaxed">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {t('يرجى التحقق من البيانات وإعادة المحاولة')}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('اسم المستلم')}</label>
              <div className="relative">
                <User className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={profile?.full_name || ''} readOnly className="w-full ps-10 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('رقم الهاتف')}</label>
              <div className="relative">
                <Phone className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" value={profile?.phone || ''} readOnly dir="ltr" className="w-full ps-10 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('عنوان التوصيل')}</label>
            <div className="relative">
              <MapPin className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('العنوان بالتفصيل')} className="w-full ps-11 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: themeColors.priceColor }} />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              {t('طريقة الدفع')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`relative rounded-2xl border-2 p-3 text-start transition-all ${
                    paymentMethod === m.id
                      ? 'shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  style={paymentMethod === m.id ? { borderColor: themeColors.priceColor, backgroundColor: `${themeColors.priceColor}0a` } : {}}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${themeColors.priceColor}14`, color: themeColors.priceColor }}
                    >
                      {METHOD_ICONS[m.id]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-gray-900">{t(m.label)}</p>
                      <p className="text-[10px] text-gray-500 truncate">{t(m.description)}</p>
                    </div>
                  </div>
                  {paymentMethod === m.id && (
                    <span
                      className="absolute top-2 start-2 w-4 h-4 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: themeColors.priceColor }}
                    >
                      <CheckCheck className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className={`mt-3 rounded-2xl border p-4 ${hasMethodNumber ? 'bg-teal-50/50 border-teal-200' : 'bg-amber-50 border-amber-200'}`}>
              {hasMethodNumber ? (
                <>
                  <p className="text-[11px] font-bold text-gray-600 mb-1">
                    {t('أرسل المبلغ إلى رقم {0}:', [t(PAYMENT_METHOD_LABEL[paymentMethod])])}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-gray-900" dir="ltr">{methodNumber}</span>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-white hover:brightness-110 active:scale-95 transition-all"
                      style={{ backgroundColor: themeColors.priceColor }}
                    >
                      {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? t('تم النسخ') : t('نسخ الرقم')}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  {t('لم يتم إعداد أرقام الدفع من الإدارة بعد، برجاء المحاولة لاحقاً.')}
                </p>
              )}
            </div>
          </div>

          {/* Payment screenshot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('صورة إثبات التحويل (سكرين شوت) *')}
            </label>
            {screenshot ? (
              <div className="relative rounded-2xl overflow-hidden border-2 max-h-56 bg-slate-900 flex items-center justify-center" style={{ borderColor: themeColors.priceColor }}>
                <img src={screenshot} alt={t('إثبات التحويل')} className="max-h-56 w-auto object-contain mx-auto" />
                <button
                  type="button"
                  onClick={() => setScreenshot(null)}
                  className="absolute top-2 end-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-300 hover:border-teal-500 rounded-2xl bg-gray-50 hover:bg-teal-50/40 transition-all cursor-pointer group text-center space-y-2">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md"
                    style={{ backgroundColor: `${themeColors.priceColor}15`, color: themeColors.priceColor }}
                  >
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{t('اضغط لرفع صورة التحويل')}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{t('JPG, PNG حتى 5MB')}</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotChange} />
                </label>
                <button
                  type="button"
                  onClick={() => setScreenshotLinkMode(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {t('أو ألصق رابط الصورة')}
                </button>
              </div>
            )}
            {screenshotLinkMode && !screenshot && (
              <div className="mt-2 flex gap-2">
                <input
                  value={screenshotLinkValue}
                  onChange={(e) => setScreenshotLinkValue(e.target.value)}
                  placeholder="https://example.com/screenshot.jpg"
                  dir="ltr"
                  className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                  style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (screenshotLinkValue.trim()) {
                      setScreenshot(screenshotLinkValue.trim());
                      setScreenshotLinkMode(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl text-white text-xs font-bold"
                  style={{ backgroundColor: themeColors.priceColor }}
                >
                  {t('استخدام الرابط')}
                </button>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('ملاحظات (اختياري)')}</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('أي تفاصيل إضافية...')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: themeColors.priceColor }} />
          </div>

          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('المجموع الفرعي ({0} منتج)', [cart.reduce((s, i) => s + i.quantity, 0)])}</span>
              <span className="font-bold text-gray-800">{t('{0} ج.م', [subtotal.toFixed(2)])}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> {t('رسوم التوصيل')}
              </span>
              <span className={`font-bold ${totalDelivery === 0 ? 'text-teal-600' : 'text-gray-800'}`}>
                {totalDelivery === 0 ? (freeThreshold > 0 && subtotal >= freeThreshold ? t('مجاني') : t('بدون رسوم')) : t('{0} ج.م', [totalDelivery.toFixed(0)])}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">{t('الإجمالي')}</span>
              <span className="font-extrabold text-lg" style={{ color: themeColors.priceColor }}>
                {t('{0} ج.م', [total.toFixed(2)])}
              </span>
            </div>
            {paymentConfig.shippingNote && (
              <p className="text-[11px] text-gray-400 leading-relaxed flex items-start gap-1 pt-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                {t(paymentConfig.shippingNote)}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 shadow-lg"
            style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> {t('تأكيد الطلب')}</>}
          </button>

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            <Lock className="w-3 h-3 inline -mt-0.5 me-1" />
            {t('بعد رفع إثبات التحويل سيراجع فريقنا العملية ويؤكد طلبك، وستصل إليك إشعارات الحالة في صفحة طلباتك.')}
          </p>
        </form>
      </div>
    </div>
  );
}
