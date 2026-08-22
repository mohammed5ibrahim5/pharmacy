import { useState, useEffect, useMemo } from 'react';
import {
  X, ShoppingBag, Lock, CheckCircle2, AlertCircle, Loader2, MapPin, User, Phone,
  Send, Info, Store, Wallet, Copy, CheckCheck, Camera, Trash2, Smartphone, Landmark,
  Link2, Truck, Sparkles, Plus, Minus, ShoppingCart, Building2, Download, FileText, ZoomIn,
  Users, Gift, Banknote, BadgeCheck, CreditCard, ExternalLink, RefreshCw, ChevronDown,
} from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useCustomer } from '@/context/CustomerContext';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { buildInvoiceImage, dataUrlToBlob } from '@/lib/invoice';
import { createPaymentIntent, findOrderGroupStatus } from '@/lib/payments';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  uploadPaymentScreenshot,
  type PaymentMethod,
} from '@/lib/orders';
import { linkPrescriptionToOrderGroup } from '@/lib/prescriptions';
import { PrescriptionUploadModal } from '@/components/PrescriptionUploadModal';
import type { Pharmacy, Product, FamilyMember } from '@/types';

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  vodafone_cash: <Smartphone className="w-5 h-5" />,
  instapay: <Landmark className="w-5 h-5" />,
  online: <CreditCard className="w-5 h-5" />,
  cash_on_delivery: <Banknote className="w-5 h-5" />,
};

interface OnlinePayment {
  groupId: string;
  amount: number;
  hostedUrl: string;
  iframeId: string;
  token: string;
}

interface CartGroup {
  key: string;
  label: string;
  pharmacy: Pharmacy | null;
  subtotal: number;
}

interface RxLite {
  id: string;
  reference_code: string | null;
  pipeline_status: string | null;
  created_at: string;
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
  const { settings, themeColors, paymentConfig, storeConfig, loyaltyConfig, featuresConfig } = useSettings();
  const { t, lang } = useLanguage();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string>('');
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [lastEarnedPoints, setLastEarnedPoints] = useState(0);
  const [lastRedeemedDiscount, setLastRedeemedDiscount] = useState(0);
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
  const [onlinePayment, setOnlinePayment] = useState<OnlinePayment | null>(null);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [paymentPaid, setPaymentPaid] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceViewer, setInvoiceViewer] = useState(false);
  const needsRx = useMemo(() => cart.some((e) => e.product.requires_prescription), [cart]);
  const [myRxList, setMyRxList] = useState<RxLite[]>([]);
  const [selectedRxId, setSelectedRxId] = useState('');
  const [rxModalOpen, setRxModalOpen] = useState(false);

  useEffect(() => {
    if (!cartOpen || !user || !needsRx) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('prescriptions')
        .select('id, reference_code, pipeline_status, created_at')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!cancelled) setMyRxList((data || []) as RxLite[]);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [cartOpen, user, needsRx, rxModalOpen]);

  const catalogMode = !storeConfig.purchasesEnabled;

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
    if (!cartOpen || !user || !featuresConfig.familyMembers) return;
    let cancelled = false;
    const loadFamily = async () => {
      const { data } = await supabase.from('family_members').select('*').eq('customer_id', user.id).order('created_at');
      if (!cancelled) setFamilyMembers((data || []) as FamilyMember[]);
    };
    loadFamily();
    return () => {
      cancelled = true;
    };
  }, [cartOpen, user, featuresConfig.familyMembers]);

  useEffect(() => {
    if (!cartOpen || !user || !loyaltyConfig.enabled) return;
    let cancelled = false;
    const loadBalance = async () => {
      const { data } = await supabase.from('customers').select('loyalty_points').eq('id', user.id).maybeSingle();
      if (!cancelled) {
        const bal = Number((data as { loyalty_points?: number } | null)?.loyalty_points || 0);
        setLoyaltyBalance(bal);
        setPointsToRedeem(0);
      }
    };
    loadBalance();
    return () => {
      cancelled = true;
    };
  }, [cartOpen, user, loyaltyConfig.enabled]);

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
    setOnlinePayment(null);
    setPaymentPaid(false);
  }, [cartOpen, profile?.phone, cartStep]);

  useEffect(() => {
    if (!onlinePayment || !user?.id) return;
    let cancelled = false;
    const check = async () => {
      const status = await findOrderGroupStatus(onlinePayment.groupId, user.id);
      if (cancelled) return;
      if (status === 'paid') {
        handlePaymentDone();
      } else {
        setPaymentChecking(false);
      }
    };
    check();
    const iv = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlinePayment?.groupId, user?.id]);

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
            : (lang === 'en' ? (pharmacy?.name_en || pharmacy?.name) : pharmacy?.name) || entry.pharmacyName || (lang === 'en' ? (p.pharmacy?.name_en || p.pharmacy?.name) : p.pharmacy?.name) || t('الصيدلية'),
          pharmacy,
          subtotal: 0,
        });
      }
      const group = map.get(key)!;
      const price = finalPriceOf(p) * entry.quantity;
      group.subtotal += price;
    });
    return Array.from(map.values());
  }, [cart, pharmacies, t, lang]);

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
  const isCOD = paymentMethod === 'cash_on_delivery';
  const isOnline = paymentMethod === 'online';
  const codFee = isCOD ? Math.max(0, parseFloat(paymentConfig.cashOnDeliveryFee) || 0) : 0;
  const total = subtotal + totalDelivery + codFee;

  // ===== Loyalty redemption =====
  const redeemStep = Math.max(1, loyaltyConfig.redeemThreshold || 1);
  const redeemValue = Math.max(0, loyaltyConfig.redeemValue || 0);
  const maxChunksByBalance = Math.floor(loyaltyBalance / redeemStep);
  const maxChunksBySubtotal = redeemValue > 0 ? Math.floor(subtotal / redeemValue) : 0;
  const usableChunks = loyaltyConfig.enabled && redeemValue > 0
    ? Math.max(0, Math.min(maxChunksByBalance, maxChunksBySubtotal))
    : 0;
  const redeemChunks = Math.min(usableChunks, Math.floor(pointsToRedeem / redeemStep));
  const loyaltyDiscount = Math.round(redeemChunks * redeemValue * 100) / 100;
  const totalAfterDiscount = Math.max(0, total - loyaltyDiscount);

  const approvedRx = myRxList.filter((r) => r.pipeline_status === 'approved');
  useEffect(() => {
    if (selectedRxId && !approvedRx.some((r) => r.id === selectedRxId)) setSelectedRxId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRxId, myRxList]);

  const displayTotal = catalogMode ? subtotal : total;

  const cartPharmacy = groups.find((g) => g.key !== '__all__')?.pharmacy || null;
  const catalogTargetName = (lang === 'en' ? (cartPharmacy?.name_en || cartPharmacy?.name) : cartPharmacy?.name) || settings.site_name || 'صيدليتي';
  const catalogWhatsapp = (storeConfig.catalogWhatsapp || cartPharmacy?.whatsapp || settings.contact_whatsapp || '').replace(/\D/g, '') || null;
  const catalogPhone = cartPharmacy?.phone || settings.contact_phone || null;

  useEffect(() => {
    if (!catalogMode || !cartOpen || cart.length === 0) {
      setInvoiceUrl(null);
      return;
    }
    let cancelled = false;
    buildInvoiceImage({
      siteName: settings.site_name || 'صيدليتي',
      title: t('فاتورة الطلب'),
      pharmacyName: catalogTargetName,
      dateLabel: new Date().toLocaleString(lang === 'en' ? 'en-GB' : 'ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      items: cart.map((entry) => {
        const unit = finalPriceOf(entry.product);
        return {
          name: lang === 'en' ? (entry.product.name_en || entry.product.name) : entry.product.name,
          quantity: entry.quantity,
          unitPrice: unit,
          lineTotal: unit * entry.quantity,
        };
      }),
      subtotal,
      total: subtotal,
      currency: t('ج.م'),
      customerLabel: t('الاسم:'),
      customerName: profile?.full_name || undefined,
      customerPhone: profile?.phone || undefined,
      subtotalLabel: t('المجموع الفرعي'),
      totalLabel: t('الإجمالي'),
      footerNote: t('فاتورة إلكترونية صادرة من منصة {0} — شكراً لثقتكم.', [settings.site_name || 'صيدليتي']),
      primaryColor: themeColors.priceColor,
    }).then((url) => {
      if (!cancelled) setInvoiceUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogMode, cartOpen, cart, subtotal, profile, settings.site_name, lang, t, themeColors.priceColor, catalogTargetName]);

  const methodNumber = isCOD ? '' : isOnline ? '' : paymentMethod === 'vodafone_cash' ? paymentConfig.vodafoneCash : paymentConfig.instapay;
  const hasMethodNumber = isCOD || isOnline || Boolean(methodNumber.trim());

  if (!cartOpen) return null;

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
        lines.push(`    ${lang === 'en' ? (entry.product.name_en || entry.product.name) : entry.product.name} × ${entry.quantity}`);
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

  const handlePaymentDone = () => {
    setOnlinePayment(null);
    setPaymentPaid(true);
    clearCart();
    setSuccess(true);
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

  // ============ Online payment gateway ============
  if (onlinePayment) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="rounded-3xl w-full max-w-xl flex flex-col overflow-hidden relative max-h-[94vh]" style={{ backgroundColor: themeColors.modalBodyBg }}>
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0" style={{ backgroundColor: themeColors.modalHeaderBg }}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${themeColors.priceColor}14`, color: themeColors.priceColor }}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-gray-900">{t('الدفع أونلاين')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('أكمل الدفع الآن عبر بوابة Paymob الآمنة — فيزا / ماستركارد / محافظ إلكترونية')}
                </p>
              </div>
              <button onClick={() => { setOnlinePayment(null); setError(null); }} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center shrink-0">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-5 overflow-y-auto space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs font-bold text-amber-700 leading-relaxed">
                {t('طلبك مسجّل بانتظار الدفع ({0} ج.م). لن يتأكد طلبك حتى يكتمل الدفع.', [onlinePayment.amount.toFixed(2)])}
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: 'min(70vh, 560px)' }}>
              <iframe
                src={onlinePayment.hostedUrl}
                title={t('الدفع أونلاين')}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.open(onlinePayment.hostedUrl, '_blank', 'noopener,noreferrer')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-xs font-bold transition-all hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                <ExternalLink className="w-4 h-4" />
                {t('فتح الدفع في نافذة جديدة')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentChecking(true)}
                disabled={paymentChecking}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${paymentChecking ? 'animate-spin' : ''}`} />
                {paymentChecking ? t('جاري التحقق من الدفع...') : t('دفعت بالفعل — تحقق من الطلب')}
              </button>
            </div>
          </div>
        </div>
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
            {paymentPaid
              ? t('تم تأكيد الدفع أونلاين بنجاح! طلبك الآن قيد المراجعة وستصلك إشعارات التحديث لحظة بلحظة.')
              : t('سنراجع إثبات التحويل الخاص بك، وبمجرد تأكيد الدفع ستصل إليك رسالة بأن طلبك في الطريق.')}
          </p>
          {groups.length > 1 && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-teal-700 mb-4">
              <Building2 className="w-4 h-4 shrink-0" />
              {t('طلبك موحّد من {0} صيدليات في توصيلة واحدة.', [groups.length])}
            </div>
          )}
          {lastRedeemedDiscount > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-teal-700 mb-4">
              <Gift className="w-4 h-4 shrink-0" />
              {t('تم خصم {0} ج.م من إجمالي طلبك باستخدام نقاط الولاء.', [lastRedeemedDiscount.toFixed(2)])}
            </div>
          )}
          {loyaltyConfig.enabled && lastEarnedPoints > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-amber-700 mb-4">
              <Sparkles className="w-4 h-4 shrink-0" />
              {t('حصلت على {0} نقطة مكافأة أُضيفت لرصيدك!', [lastEarnedPoints])}
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
    if (isCOD || !methodNumber) return;
    try {
      await navigator.clipboard.writeText(methodNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleDownloadInvoice = () => {
    if (!invoiceUrl) return;
    const a = document.createElement('a');
    a.href = invoiceUrl;
    a.download = `invoice-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSendInvoice = async () => {
    if (!invoiceUrl) return;
    setInvoiceLoading(true);
    try {
      if (catalogWhatsapp) {
        try {
          const blob = dataUrlToBlob(invoiceUrl);
          if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          }
        } catch {
          // clipboard unavailable — the user can attach the invoice manually
        }
        window.open(buildWhatsAppLink(catalogWhatsapp, buildWhatsAppMessage()), '_blank', 'noopener,noreferrer');
        return;
      }
      const blob = dataUrlToBlob(invoiceUrl);
      const file = new File([blob], `invoice-${Date.now()}.png`, { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: t('فاتورة الطلب') });
      }
    } catch {
      // user cancelled the share sheet — nothing to do
    } finally {
      setInvoiceLoading(false);
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
    if (!isCOD && !isOnline && !hasMethodNumber) {
      setError(t('لم يتم إعداد رقم الدفع من الإدارة بعد، يرجى المحاولة لاحقاً.'));
      setLoading(false);
      return;
    }
    if (!isCOD && !isOnline && !screenshot) {
      setError(t('يرجى رفع صورة إثبات التحويل (سكرين شوت) حتى يتم تأكيد الطلب.'));
      setLoading(false);
      return;
    }
    if (needsRx && !selectedRxId) {
      setError(t('الطلب يحتوي أدوية تتطلب روشتة معتمدة من صيدلي — ارفع روشتك وانتظر الاعتماد ثم أكمل الطلب.'));
      setLoading(false);
      return;
    }

    try {
      const screenshotUrl = isCOD || isOnline ? null : screenshot!.startsWith('data:') ? await uploadPaymentScreenshot(screenshot!, user.id) : screenshot;
      const redeemedPoints = redeemChunks * redeemStep;
      const { data: groupData, error: groupErr } = await supabase
        .from('order_groups')
        .insert({
          customer_id: user.id,
          family_member_id: selectedFamilyMember || null,
          address: address || null,
          note: note || null,
          status: 'pending',
          payment_method: paymentMethod,
          payment_number: methodNumber,
          payment_screenshot_url: screenshotUrl,
          delivery_fee: totalDelivery,
          total_price: totalAfterDiscount,
          loyalty_discount: loyaltyDiscount,
          points_used: redeemedPoints,
        })
        .select('id')
        .single();
      if (groupErr) {
        setError(localizedError(groupErr.message, lang));
        setLoading(false);
        return;
      }

      const lineTotals = cart.map((entry) => finalPriceOf(entry.product) * entry.quantity);
      const lineSum = lineTotals.reduce((s, v) => s + v, 0) || 1;
      const rows = cart.map((entry, i) => {
        const price = lineTotals[i];
        const share = lineSum > 0 ? (price / lineSum) * loyaltyDiscount : 0;
        const rounded = i === cart.length - 1
          ? Math.max(0, Math.round((loyaltyDiscount - lineTotals.slice(0, -1).reduce((s, v) => s + Math.round((v / lineSum) * loyaltyDiscount * 100) / 100, 0)) * 100) / 100)
          : Math.round(share * 100) / 100;
        return {
          customer_id: user.id,
          family_member_id: selectedFamilyMember || null,
          product_id: entry.product.id,
          pharmacy_id: entry.product.pharmacy_id || null,
          quantity: entry.quantity,
          total_price: Math.max(0, Math.round((price - rounded) * 100) / 100),
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
        if (selectedRxId) {
          try {
            await linkPrescriptionToOrderGroup(selectedRxId, groupData.id);
          } catch {
            // لا نعطل الطلب لو فشل الربط
          }
        }
        const { data: customer } = await supabase.from('customers').select('loyalty_points').eq('id', user.id).maybeSingle();
        const current = Number((customer as { loyalty_points?: number } | null)?.loyalty_points || 0);

        if (redeemedPoints > 0) {
          const newBalance = Math.max(0, current - redeemedPoints);
          await supabase.from('customers').update({ loyalty_points: newBalance }).eq('id', user.id);
          await supabase.from('loyalty_transactions').insert({
            customer_id: user.id,
            points: -redeemedPoints,
            reason: t('استبدال {0} نقطة بخصم {1} ج.م', [redeemedPoints, loyaltyDiscount.toFixed(2)]),
          });
        }
        // النقاط تُضاف بعد تأكيد الأدمن (status = confirmed/delivered)
        setLastEarnedPoints(0);
        setLastRedeemedDiscount(loyaltyDiscount);
      }
      if (isOnline) {
        try {
          const intent = await createPaymentIntent({
            amount: Math.round(totalAfterDiscount * 100) / 100,
            phone: address || profile?.phone || '',
            email: user?.email || '',
            firstName: profile?.full_name?.split(' ')[0] || 'عميل',
            lastName: profile?.full_name?.split(' ').slice(1).join(' ') || '',
            orderGroupId: groupData.id,
          });
          setOnlinePayment({
            groupId: groupData.id,
            amount: totalAfterDiscount,
            hostedUrl: intent.hostedUrl,
            iframeId: intent.iframeId,
            token: intent.token,
          });
          setPaymentPaid(false);
        } catch {
          setError(t('تعذر بدء الدفع أونلاين الآن، يمكنك إتمامه لاحقاً من صفحة طلباتك.'));
        }
      } else {
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
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
        <div className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
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
                  {!catalogMode && g.key !== '__all__' && g.pharmacy?.delivery_available !== false && (
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
                            <p className="text-[13px] font-bold text-gray-900 truncate">{lang === 'en' ? (entry.product.name_en || entry.product.name) : entry.product.name}</p>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">{t(entry.product.unit) || t('قطعة')} · {t('{0} ج.م', [price.toFixed(2)])}</p>
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
            <div
              className={
                catalogMode
                  ? 'rounded-2xl border-2 border-dashed p-4 space-y-2.5'
                  : 'rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2.5'
              }
              style={
                catalogMode
                  ? { borderColor: `${themeColors.priceColor}40`, backgroundColor: `${themeColors.priceColor}05` }
                  : undefined
              }
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-black flex items-center gap-1.5" style={{ color: themeColors.priceColor }}>
                  <FileText className="w-4 h-4" />
                  {t('فاتورة الطلب')}
                </span>
                <span className="text-[11px] text-gray-400 font-bold">
                  {t('{0} منتج', [cart.reduce((s, i) => s + i.quantity, 0)])}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{t('المجموع الفرعي')}</span>
                <span className="font-bold text-gray-800">{t('{0} ج.م', [subtotal.toFixed(2)])}</span>
              </div>
              {!catalogMode && (
                <>
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
                </>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-dashed" style={{ borderColor: `${themeColors.priceColor}25` }}>
                <span className="text-sm font-bold text-gray-700">{t('الإجمالي')}</span>
                <span className="font-black text-lg" style={{ color: themeColors.priceColor }}>
                  {t('{0} ج.م', [displayTotal.toFixed(2)])}
                </span>
              </div>
            </div>

            {/* Invoice image preview (catalog mode) */}
            {catalogMode && cart.length > 0 && (
              invoiceUrl ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-3 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black text-gray-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
                      {t('فاتورة الطلب')}
                    </p>
                    <button
                      onClick={handleDownloadInvoice}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-50 border border-gray-200 transition-colors"
                    >
                      <Download className="w-3 h-3" /> {t('تنزيل الفاتورة')}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvoiceViewer(true)}
                    className="relative w-full block cursor-zoom-in group rounded-xl overflow-hidden"
                  >
                    <img src={invoiceUrl} alt={t('فاتورة الطلب')} className="w-full rounded-xl border border-gray-100" />
                    <span
                      className="absolute bottom-2 end-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-sm transition-opacity group-hover:opacity-90"
                    >
                      <ZoomIn className="w-3 h-3" />
                      {t('اضغط لتكبير الفاتورة')}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t('جاري تجهيز الفاتورة...')}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="p-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 shrink-0" style={{ backgroundColor: themeColors.modalHeaderBg }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500">{t('الإجمالي')}</span>
              <span className="font-black text-xl" style={{ color: themeColors.priceColor }}>
                {displayTotal.toFixed(2)} <span className="text-xs text-gray-400 font-medium">{t('ج.م')}</span>
              </span>
            </div>
            {catalogMode ? (
              <>
                {catalogWhatsapp ? (
                  <button
                    onClick={handleSendInvoice}
                    disabled={invoiceLoading || !invoiceUrl}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-[15px] transition-all hover:brightness-105 active:scale-[0.99] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#25d366', boxShadow: '0 8px 20px -6px #25d36688' }}
                  >
                    {invoiceLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {t('إرسال الفاتورة واتساب')}
                  </button>
                ) : catalogPhone ? (
                  <a
                    href={`tel:${catalogPhone}`}
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
                  {catalogWhatsapp
                    ? t('سيُفتح الشات مباشرة مع {0} — صورة الفاتورة منسوخة، اضغط Ctrl+V (أو ضغط مطوّل) للصقها في الشات.', [catalogTargetName])
                    : t('بدون دفع مسبق — أرسل قائمتك للصيدلية وسيتواصل معك الصيدلي.')}
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
                  if (needsRx && !selectedRxId) {
                    setCartStep('rx');
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

        {invoiceViewer && invoiceUrl && (
          <div className="fixed inset-0 z-[95] bg-black/90 flex flex-col" onClick={() => setInvoiceViewer(false)}>
            <div className="flex items-center justify-between gap-2 p-4 shrink-0">
              <p className="text-sm font-bold text-white flex items-center gap-1.5" dir="rtl">
                <FileText className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                {t('فاتورة الطلب')}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadInvoice}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> {t('تنزيل الفاتورة')}
                </button>
                <button
                  onClick={() => setInvoiceViewer(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label={t('إغلاق')}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex justify-center items-start p-4" dir="ltr" onClick={(e) => e.stopPropagation()}>
              <img
                src={invoiceUrl}
                alt={t('فاتورة الطلب')}
                style={{ width: 620, maxWidth: 'none' }}
                className="rounded-xl shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ Prescription gate step ============
  if (cartStep === 'rx') {
    return (
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
        <div className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto p-6 relative space-y-4" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setCartStep('cart')} className="absolute top-4 end-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label={t('رجوع')}>
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="text-center space-y-1.5 pt-2">
            <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="font-black text-lg text-gray-900">{t('أول خطوة: روشتة معتمدة')}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('سلتك تحتوي أدوية لا تُصرف إلا بروشتة معتمدة من صيدلي مرخص. اختر روشتة معتمدة أو ارفع واحدة — وبعد الاعتماد تكمل الدفع.')}
            </p>
          </div>

          {approvedRx.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-gray-700">{t('روشتاتك المعتمدة:')}</p>
              {approvedRx.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRxId(selectedRxId === r.id ? '' : r.id)}
                  className={`w-full flex items-center justify-between rounded-xl border-2 p-3 text-start transition-all ${
                    selectedRxId === r.id ? 'border-transparent bg-white shadow-md' : 'border-gray-200 bg-white/70 hover:border-gray-300'
                  }`}
                  style={selectedRxId === r.id ? { borderColor: themeColors.priceColor } : undefined}
                >
                  <span className="flex items-center gap-2 font-bold text-sm text-gray-700">
                    {selectedRxId === r.id
                      ? <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: themeColors.priceColor }} />
                      : <span className="w-5 h-5 rounded-full border-2 border-gray-300 inline-block shrink-0" />}
                    <span>
                      {t('روشتة')} {r.reference_code || `#${r.id.slice(0, 8)}`}
                      <span className="block text-[10px] font-medium text-teal-600">{t('معتمدة من صيدلي ✓')}</span>
                    </span>
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(r.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {myRxList.filter((r) => r.pipeline_status !== 'approved' && !['rejected', 'auto_rejected', 'dispensed', 'cancelled'].includes(r.pipeline_status || '')).length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 font-bold leading-relaxed flex items-start gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin mt-0.5 shrink-0" />
              {t('عندك روشتات قيد الفحص والمراجعة حالياً — هتظهر هنا تلقائياً بعد اعتماد الصيدلي وتقدر تكمل الدفع وقتها.')}
            </div>
          )}

          <button
            type="button"
            onClick={() => setRxModalOpen(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 text-teal-700 font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-teal-50 transition-colors"
          >
            <Camera className="w-4 h-4" />
            {approvedRx.length > 0 ? t('ارفع روشتة جديدة') : t('ارفع روشتك الآن')}
          </button>

          <button
            type="button"
            disabled={!selectedRxId}
            onClick={() => setCartStep('checkout')}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all active:scale-[0.99] ${
              selectedRxId ? 'shadow-lg hover:brightness-105' : 'opacity-40 cursor-not-allowed'
            }`}
            style={{ backgroundColor: themeColors.priceColor }}
          >
            <Send className="w-5 h-5" />
            {selectedRxId ? t('تمام! متابعة إلى الدفع') : t('اختر روشتة معتمدة للمتابعة')}
          </button>

          <button
            type="button"
            onClick={() => setCartStep('cart')}
            className="w-full text-xs font-bold text-gray-500 hover:text-gray-700"
          >
            {t('← رجوع للسلة')}
          </button>

          <PrescriptionUploadModal open={rxModalOpen} onClose={() => setRxModalOpen(false)} />
        </div>
      </div>
    );
  }

  // ============ Checkout step ============
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
      <div className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[92vh] overflow-y-auto p-6 relative" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
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

          {/* For whom */}
          {featuresConfig.familyMembers && familyMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('الطلب لمين؟')}</label>
              <div className="relative">
                <Users className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedFamilyMember}
                  onChange={(e) => setSelectedFamilyMember(e.target.value)}
                  className="w-full ps-11 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                  style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                >
                  <option value="">{t('نفسي (أنا)')}</option>
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}{m.age != null ? ` (${m.age} ${t('سنة')})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('عنوان التوصيل')}</label>
            <div className="relative">
              <MapPin className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('العنوان بالتفصيل')} className="w-full ps-11 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: themeColors.priceColor }} />
            </div>
          </div>

          {/* Prescription requirement */}
          {needsRx && (
            selectedRxId ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BadgeCheck className="w-5 h-5 text-teal-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-teal-800 truncate">
                      {t('روشتة معتمدة')} — {approvedRx.find((r) => r.id === selectedRxId)?.reference_code || `#${selectedRxId.slice(0, 8)}`}
                    </p>
                    <p className="text-[10px] text-teal-600">{t('مرتبطة بهذا الطلب')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCartStep('rx')}
                  className="text-[11px] font-extrabold text-teal-700 hover:text-teal-900 shrink-0"
                >
                  {t('تغيير')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCartStep('rx')}
                className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50 p-3.5 flex items-center justify-between gap-2 text-start"
              >
                <span className="flex items-center gap-2 text-xs font-extrabold text-amber-800">
                  <FileText className="w-4 h-4 shrink-0" />
                  {t('مطلوب: اختر روشتة معتمدة للأدوية في سلتك')}
                </span>
                <ChevronDown className="w-4 h-4 text-amber-600 -rotate-90 shrink-0" />
              </button>
            )
          )}

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              {t('طريقة الدفع')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.filter((m) => (
                (m.id !== 'cash_on_delivery' || paymentConfig.showCashOnDelivery) &&
                (m.id !== 'online' || paymentConfig.showOnlinePayment)
              )).map((m) => (
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

            {isCOD ? (
              <div className="mt-3 rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
                <p className="text-[11px] font-bold text-gray-600 mb-1 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                  {t('ادفع نقداً عند استلام طلبك — لا حاجة لتحويل أو صورة إثبات.')}
                </p>
                {codFee > 0 && (
                  <p className="text-xs font-extrabold text-gray-900">
                    {t('رسوم الدفع عند الاستلام:')} <span dir="ltr">{codFee} {t('ج.م')}</span>
                  </p>
                )}
              </div>
            ) : isOnline ? (
              <div className="mt-3 rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
                <p className="text-[11px] font-bold text-gray-600 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                  {t('سيتم توجيهك لصفحة دفع آمنة (Paymob) لإتمام الدفع بفيزا أو ماستركارد أو محفظة إلكترونية — الدفع مضمون ومشفّر.')}
                </p>
              </div>
            ) : (
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
            )}
          </div>

          {/* Payment screenshot */}
          {!isCOD && !isOnline && (
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
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('ملاحظات (اختياري)')}</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('أي تفاصيل إضافية...')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: themeColors.priceColor }} />
          </div>

          {loyaltyConfig.enabled && redeemValue > 0 && loyaltyBalance > 0 && (
            <div className="rounded-2xl border border-dashed p-4 space-y-3" style={{ borderColor: `${themeColors.priceColor}66` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                  <span className="text-sm font-bold text-gray-800">{t('نقاطك المتاحة')}</span>
                </div>
                <span className="text-sm font-extrabold" style={{ color: themeColors.priceColor }}>{loyaltyBalance} {t('نقطة')}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {t('كل {0} نقطة = خصم {1} ج.م على طلبك', [redeemStep, redeemValue.toFixed(0)])}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={usableChunks * redeemStep}
                    step={redeemStep}
                    value={Math.min(pointsToRedeem, usableChunks * redeemStep)}
                    onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs font-bold text-gray-700 w-16 text-center">{t('{0} نقطة', [Math.min(pointsToRedeem, usableChunks * redeemStep)])}</span>
                </div>
                {redeemChunks === 0 && usableChunks > 0 && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {t('يمكنك استبدال حتى {0} نقطة بخصم {1} ج.م', [usableChunks * redeemStep, (usableChunks * redeemValue).toFixed(0)])}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPointsToRedeem(pointsToRedeem >= redeemStep ? 0 : Math.min(usableChunks * redeemStep, loyaltyBalance))}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  redeemChunks > 0 ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white'
                }`}
                style={redeemChunks > 0 ? { backgroundColor: themeColors.priceColor } : undefined}
              >
                {redeemChunks > 0
                  ? t('سيتم خصم {0} ج.م من إجمالي طلبك', [loyaltyDiscount.toFixed(2)])
                  : t('استخدم نقاطك للحصول على خصم')}
              </button>
            </div>
          )}

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
            {loyaltyDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" /> {t('خصم نقاط الولاء')}
                </span>
                <span className="font-bold text-teal-600">-{t('{0} ج.م', [loyaltyDiscount.toFixed(2)])}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">{t('الإجمالي')}</span>
              <span className="font-extrabold text-lg" style={{ color: themeColors.priceColor }}>
                {t('{0} ج.م', [totalAfterDiscount.toFixed(2)])}
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
      <PrescriptionUploadModal open={rxModalOpen} onClose={() => setRxModalOpen(false)} />
    </div>
  );
}
