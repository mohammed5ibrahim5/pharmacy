import { useState, useEffect } from 'react';
import {
  X, ShoppingBag, Lock, CheckCircle2, AlertCircle, Loader2, MapPin, User, Phone,
  Send, Info, Store, Wallet, Copy, CheckCheck, Camera, Trash2, Smartphone, Landmark, Link2, Truck, Sparkles,
} from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useCustomer } from '@/context/CustomerContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabase';
import { translateError } from '@/lib/errorMessages';
import { awardLoyaltyPoints } from '@/lib/loyalty';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  uploadPaymentScreenshot,
  type PaymentMethod,
} from '@/lib/orders';
import type { Pharmacy } from '@/types';

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  vodafone_cash: <Smartphone className="w-5 h-5" />,
  instapay: <Landmark className="w-5 h-5" />,
};

export function OrderModal() {
  const { orderItem, orderModalOpen, closeOrder } = useOrder();
  const { user, profile, setAuthModalOpen } = useCustomer();
  const { settings, themeColors, paymentConfig, storeConfig, loyaltyConfig, featuresConfig } = useSettings();
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState(profile?.phone || '');
  const [note, setNote] = useState('');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyId, setPharmacyId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vodafone_cash');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotLinkMode, setScreenshotLinkMode] = useState(false);
  const [screenshotLinkValue, setScreenshotLinkValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuantity(1);
    setAddress(profile?.phone || '');
    setNote('');
    setScreenshot(null);
    setScreenshotLinkMode(false);
    setScreenshotLinkValue('');
    setError(null);
    setSuccess(false);
    setCopied(false);
    if (orderItem?.product) {
      setPharmacyId(orderItem.product.for_all_pharmacies ? '' : orderItem.product.pharmacy_id);
    }
  }, [orderItem, profile?.phone]);

  useEffect(() => {
    if (!orderModalOpen) return;
    let cancelled = false;
    const loadPharmacies = async () => {
      const { data } = await supabase.from('pharmacies').select('*').order('name');
      if (!cancelled) setPharmacies((data || []) as Pharmacy[]);
    };
    loadPharmacies();
    return () => {
      cancelled = true;
    };
  }, [orderModalOpen]);

  if (!orderModalOpen || !orderItem) return null;

  const product = orderItem.product;
  const activeDiscount = product.discounts?.find((d) => d.is_active);
  const finalPrice = activeDiscount
    ? product.price * (1 - activeDiscount.discount_percentage / 100)
    : product.price;

  const selectedPharmacy = pharmacies.find((p) => p.id === pharmacyId);
  const methodNumber = paymentMethod === 'vodafone_cash' ? paymentConfig.vodafoneCash : paymentConfig.instapay;
  const hasMethodNumber = Boolean(methodNumber.trim());

  // Catalog mode: online purchases are disabled, contact the pharmacy directly
  if (!storeConfig.purchasesEnabled) {
    const pharmacy = product.for_all_pharmacies
      ? null
      : pharmacies.find((p) => p.id === (pharmacyId || product.pharmacy_id)) || null;
    const phone = pharmacy?.phone || settings.contact_phone || null;
    const whatsapp = pharmacy?.whatsapp || settings.contact_whatsapp || null;
    const contactName = pharmacy?.name || orderItem.pharmacyName || settings.site_name;
    const whatsappDigits = whatsapp ? whatsapp.replace(/\D/g, '') : null;

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeOrder}>
        <div className="rounded-3xl w-full max-w-md p-6 relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
          <button onClick={closeOrder} className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="text-center mb-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${themeColors.priceColor}12`, color: themeColors.priceColor }}
            >
              <Phone className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">تواصل مع الصيدلية مباشرة</h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">{storeConfig.contactMessage}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 mb-5">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <Store className="w-3.5 h-3.5 shrink-0" />
                {contactName}
              </p>
              <p className="text-xs font-bold mt-0.5" style={{ color: themeColors.priceColor }}>
                {finalPrice.toFixed(2)} ج.م
              </p>
            </div>
          </div>

          {whatsappDigits ? (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeOrder}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all hover:scale-[1.01] active:scale-95 shadow-lg mb-3"
              style={{ backgroundColor: '#25d366', boxShadow: '0 8px 20px -6px #25d36688' }}
            >
              <Send className="w-5 h-5" />
              مراسلة {contactName} واتساب
            </a>
          ) : (
            phone && (
              <a
                href={`tel:${phone}`}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all hover:scale-[1.01] active:scale-95 shadow-lg mb-3"
                style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
              >
                <Phone className="w-5 h-5" />
                الاتصال بـ {contactName}
              </a>
            )
          )}

          {phone && whatsappDigits && (
            <a
              href={`tel:${phone}`}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.01] active:scale-95 border-2 mb-3"
              style={{ borderColor: themeColors.priceColor, color: themeColors.priceColor }}
            >
              <Phone className="w-5 h-5" />
              الاتصال المباشر
            </a>
          )}

          {!phone && !whatsappDigits && (
            <div className="w-full py-3.5 rounded-xl mb-3 bg-amber-50 border border-amber-200 text-center">
              <p className="text-xs font-bold text-amber-700">لا يتوفر رقم تواصل مسجل حالياً، حاول لاحقاً.</p>
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            <Info className="w-3 h-3 inline -mt-0.5 ml-1" />
            الطلب المباشر أونلاين متوقف حالياً، يمكنك الاتصال بالصيدلية لتأكيد توفر المنتج وطريقة الشراء.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeOrder}>
        <div className="rounded-3xl w-full max-w-md p-6 relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
          <button onClick={closeOrder} className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${themeColors.priceColor}12` }}
            >
              <Lock className="w-8 h-8" style={{ color: themeColors.priceColor }} />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">سجّل دخولك أولاً</h2>
            <p className="text-gray-500 text-sm mt-2">يجب تسجيل الدخول أو إنشاء حساب لتتمكن من طلب المنتجات</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 mb-6">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
              <p className="text-xs text-gray-500">{finalPrice.toFixed(2)} ج.م</p>
            </div>
          </div>

          <button
            onClick={() => { closeOrder(); setAuthModalOpen(true); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all hover:scale-[1.01] active:scale-95 shadow-lg"
            style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
          >
            <User className="w-5 h-5" />
            تسجيل الدخول / إنشاء حساب
          </button>
        </div>
      </div>
    );
  }

  // Logged in - order form
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.');
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

    if (!pharmacyId) {
      setError('يرجى اختيار الصيدلية التي ستقوم بالطلب منها.');
      setLoading(false);
      return;
    }
    if (!hasMethodNumber) {
      setError('لم يتم إعداد رقم الدفع من الإدارة بعد، يرجى المحاولة لاحقاً.');
      setLoading(false);
      return;
    }
    if (!screenshot) {
      setError('يرجى رفع صورة إثبات التحويل (سكرين شوت) حتى يتم تأكيد الطلب.');
      setLoading(false);
      return;
    }

    try {
      const screenshotUrl = screenshot.startsWith('data:') ? await uploadPaymentScreenshot(screenshot) : screenshot;
      const { error: err } = await supabase.from('orders').insert({
        customer_id: user.id,
        product_id: product.id,
        pharmacy_id: pharmacyId,
        quantity,
        total_price: finalPrice * quantity,
        address: address || null,
        note: note || null,
        status: 'pending',
        payment_method: paymentMethod,
        payment_number: methodNumber,
        payment_screenshot_url: screenshotUrl,
      });
      if (err) {
        setError(translateError(err.message).ar);
      } else {
        const earnedPoints = loyaltyConfig.enabled ? loyaltyConfig.pointsPerOrder : 0;
        if (earnedPoints > 0) {
          const { data: customer } = await supabase.from('customers').select('loyalty_points').eq('id', user.id).maybeSingle();
          const current = Number((customer as { loyalty_points?: number } | null)?.loyalty_points || 0);
          await awardLoyaltyPoints(user.id, current + earnedPoints, `مكافأة طلب: ${product.name}`);
        }
        setSuccess(true);
      }
    } catch {
      setError('فشل رفع صورة التحويل، برجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeOrder}>
        <div className="rounded-3xl w-full max-w-md p-8 text-center relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
          <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">تم استلام طلبك بنجاح!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-3">
            سنراجع إثبات التحويل الخاص بك، وبمجرد تأكيد الدفع ستصل إليك رسالة بأن طلبك في الطريق.
          </p>
          {loyaltyConfig.enabled && loyaltyConfig.pointsPerOrder > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-amber-700 mb-4">
              <Sparkles className="w-4 h-4 shrink-0" />
              حصلت على {loyaltyConfig.pointsPerOrder} نقطة مكافأة أُضيفت لرصيدك!
            </div>
          )}
          {selectedPharmacy && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 mb-6 text-xs font-bold text-gray-700">
              <Store className="w-4 h-4" style={{ color: themeColors.priceColor }} />
              سيتم التوصيل من: {selectedPharmacy.name}
            </div>
          )}
          <button
            onClick={closeOrder}
            className="w-full py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: themeColors.priceColor }}
          >
            حسناً
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeOrder}>
      <div className="rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
        <button onClick={closeOrder} className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">{product.name}</p>
            {orderItem.pharmacyName && <p className="text-xs text-gray-500">{orderItem.pharmacyName}</p>}
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-extrabold" style={{ color: themeColors.priceColor }}>{finalPrice.toFixed(2)}</span>
              <span className="text-xs text-gray-500">ج.م</span>
            </div>
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
                  يرجى التحقق من البيانات وإعادة المحاولة
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">الكمية</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 font-bold text-lg">-</button>
              <span className="w-12 text-center font-bold text-lg">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 font-bold text-lg">+</button>
            </div>
          </div>

          {/* Pharmacy selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              اختر الصيدلية التي تريد الطلب منها
            </label>
            <div className="relative">
              <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={pharmacyId}
                onChange={(e) => setPharmacyId(e.target.value)}
                className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 appearance-none"
                style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
              >
                <option value="">اختر الصيدلية...</option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {selectedPharmacy && (
              <p className="text-[11px] font-bold text-gray-500 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
                سيتم تنفيذ الطلب من صيدلية {selectedPharmacy.name}
              </p>
            )}
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم المستلم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={profile?.full_name || ''} readOnly className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" value={profile?.phone || ''} readOnly dir="ltr" className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">عنوان التوصيل</label>
            <div className="relative">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان بالتفصيل" className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: themeColors.priceColor }} />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              طريقة الدفع
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`relative rounded-2xl border-2 p-3 text-right transition-all ${
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
                      <p className="text-xs font-extrabold text-gray-900">{m.label}</p>
                      <p className="text-[10px] text-gray-500 truncate">{m.description}</p>
                    </div>
                  </div>
                  {paymentMethod === m.id && (
                    <span
                      className="absolute top-2 left-2 w-4 h-4 rounded-full flex items-center justify-center text-white"
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
                    أرسل المبلغ إلى رقم {PAYMENT_METHOD_LABEL[paymentMethod]}:
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
                      {copied ? 'تم النسخ' : 'نسخ الرقم'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  لم يتم إعداد أرقام الدفع من الإدارة بعد، برجاء المحاولة لاحقاً.
                </p>
              )}
            </div>
          </div>

          {/* Payment screenshot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              صورة إثبات التحويل (سكرين شوت) *
            </label>
            {screenshot ? (
              <div className="relative rounded-2xl overflow-hidden border-2 max-h-56 bg-slate-900 flex items-center justify-center" style={{ borderColor: themeColors.priceColor }}>
                <img src={screenshot} alt="إثبات التحويل" className="max-h-56 w-auto object-contain mx-auto" />
                <button
                  type="button"
                  onClick={() => setScreenshot(null)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow"
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
                    <p className="text-xs font-bold text-gray-800">اضغط لرفع صورة التحويل</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">JPG, PNG حتى 5MB</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotChange} />
                </label>
                <button
                  type="button"
                  onClick={() => setScreenshotLinkMode(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  أو ألصق رابط الصورة
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
                  استخدام الرابط
                </button>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات (اختياري)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="أي تفاصيل إضافية..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: themeColors.priceColor }} />
          </div>

          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">سعر المنتج × {quantity}</span>
              <span className="font-bold text-gray-800">{(finalPrice * quantity).toFixed(2)} ج.م</span>
            </div>
            {(() => {
              const subtotal = finalPrice * quantity;
              const freeThreshold = parseFloat(paymentConfig.freeDeliveryThreshold) || 0;
              const fee = parseFloat(paymentConfig.deliveryFee) || 0;
              const deliveryFree = freeThreshold > 0 && subtotal >= freeThreshold;
              return (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> رسوم التوصيل
                  </span>
                  <span className={`font-bold ${deliveryFree ? 'text-teal-600' : 'text-gray-800'}`}>
                    {deliveryFree ? 'مجاني' : `${fee.toFixed(0)} ج.م`}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">الإجمالي</span>
              <span className="font-extrabold text-lg" style={{ color: themeColors.priceColor }}>
                {(() => {
                  const subtotal = finalPrice * quantity;
                  const freeThreshold = parseFloat(paymentConfig.freeDeliveryThreshold) || 0;
                  const fee = (freeThreshold > 0 && subtotal >= freeThreshold) ? 0 : (parseFloat(paymentConfig.deliveryFee) || 0);
                  return (subtotal + fee).toFixed(2);
                })()} ج.م
              </span>
            </div>
            {paymentConfig.shippingNote && (
              <p className="text-[11px] text-gray-400 leading-relaxed flex items-start gap-1 pt-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                {paymentConfig.shippingNote}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 shadow-lg"
            style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> تأكيد الطلب</>}
          </button>

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            <Lock className="w-3 h-3 inline -mt-0.5 ml-1" />
            بعد رفع إثبات التحويل سيراجع فريقنا العملية ويؤكد طلبك، وستصل إليك إشعارات الحالة في صفحة طلباتك.
          </p>
        </form>
      </div>
    </div>
  );
}
