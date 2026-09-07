import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { useRouter } from '@/context/RouterContext';
import { useOrder } from '@/context/OrderContext';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';
import { localizedDate } from '@/lib/format';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { createPaymentIntent, findOrderGroupStatus } from '@/lib/payments';
import type { FamilyMember } from '@/types';
import { OrderProgressTracker } from './OrderProgressTracker';
import {
  PackageCheck, Search, X, Clock, CheckCircle2, Truck, Store,
  Pill, MapPin, Tag, Wallet, Info, Navigation, Star, CreditCard,
  Loader2, RefreshCw, AlertTriangle, AlertCircle, ExternalLink,
  Sparkles, ShoppingCart, MessageCircle,
} from 'lucide-react';
import type { OrderRecord } from './types';
import type { Product } from '@/types';
import { STATUS_META } from './types';

interface OrdersTabProps {
  onTrackingOrder: (o: OrderRecord | null) => void;
  onReviewOrder: (o: OrderRecord | null) => void;
}

export function OrdersTab({ onTrackingOrder, onReviewOrder }: OrdersTabProps) {
  const { user, profile } = useCustomer();
  const { themeColors, featuresConfig, settings } = useSettings();
  const { t, lang } = useLanguage();
  const { navigate } = useRouter();
  const { openOrder, addToCart, openCart } = useOrder();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [ordersRetryCount, setOrdersRetryCount] = useState(0);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [payLoadingGroup, setPayLoadingGroup] = useState<string | null>(null);
  const [onlinePayment, setOnlinePayment] = useState<{ hostedUrl: string; amount: number; groupId: string } | null>(null);
  const [payChecking, setPayChecking] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setOrdersLoading(true);
    setOrdersError(false);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, product:products(*), pharmacy:pharmacies(*), order_group:order_groups!orders_order_group_id_fkey(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      let rows = (data || []) as OrderRecord[];
      if (error) {
        showToast(localizedError(error.message, lang));
        setOrdersError(true);
      } else if (featuresConfig.familyMembers) {
        const ids = Array.from(new Set(rows.map((o) => o.family_member_id).filter((v): v is string => !!v)));
        if (ids.length > 0) {
          const { data: members } = await supabase
            .from('family_members')
            .select('*')
            .in('id', ids);
          const map = new Map((members || []).map((m: FamilyMember) => [m.id, m]));
          rows = rows.map((o) => (o.family_member_id && map.get(o.family_member_id) ? { ...o, family_member: map.get(o.family_member_id) } : o));
        }
      }
      setOrders(rows);
    } catch {
      setOrdersError(true);
    } finally {
      setOrdersLoading(false);
    }
  }, [user, lang, featuresConfig.familyMembers]);

  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [fetchOrders, ordersRetryCount]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`customer-orders-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_groups', filter: `customer_id=eq.${user.id}` }, () => fetchOrders())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchOrders]);

  const continuePayment = async (order: OrderRecord) => {
    const group = order.order_group;
    const groupId = group?.id || order.order_group_id;
    if (!group || !groupId) {
      showToast(t('تعذر العثور على بيانات الدفع لهذا الطلب.'));
      return;
    }
    const amount = Number(group.total_price || order.total_price || 0);
    setPayLoadingGroup(groupId);
    try {
      const intent = await createPaymentIntent({
        amount,
        phone: order.address || profile?.phone || '',
        email: user?.email || '',
        firstName: profile?.full_name?.split(' ')[0] || 'عميل',
        lastName: profile?.full_name?.split(' ').slice(1).join(' ') || '',
        orderGroupId: groupId,
      });
      setOnlinePayment({ hostedUrl: intent.hostedUrl, amount, groupId });
    } catch {
      showToast(t('تعذر بدء الدفع أونلاين الآن، حاول مرة أخرى.'));
    } finally {
      setPayLoadingGroup(null);
    }
  };

  const askPharmacistAboutOrder = (order: OrderRecord) => {
    if (!settings.contact_whatsapp) return;
    const productName = lang === 'en' ? (order.product?.name_en || order.product?.name || '') : order.product?.name || t('منتج');
    const text = t('مرحباً، أريد الاستفسار عن طلبي رقم {0}.\nالدواء: {1}\nالحالة الحالية: {2}', [
      order.id.slice(0, 8).toUpperCase(),
      productName,
      t(STATUS_META[order.status]?.label || STATUS_META.pending.label),
    ]);
    window.open(buildWhatsAppLink(settings.contact_whatsapp, text), '_blank', 'noopener,noreferrer');
  };

  const handlePayChecking = async () => {
    if (!onlinePayment || !user) return;
    setPayChecking(true);
    try {
      const status = await findOrderGroupStatus(onlinePayment.groupId, user.id);
      if (status === 'paid') {
        showToast(t('تم تأكيد الدفع بنجاح. شكراً لك!'));
        setOnlinePayment(null);
        fetchOrders();
      } else {
        showToast(t('لم يتم العثور على عملية دفع مكتملة بعد، حاول مجدداً.'));
      }
    } finally {
      setPayChecking(false);
    }
  };

  const visibleOrders = useMemo(() => {
    let list = orders;
    if (orderFilter === 'active') list = list.filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'shipped');
    if (orderFilter === 'delivered') list = list.filter((o) => o.status === 'delivered');
    if (orderFilter === 'cancelled') list = list.filter((o) => o.status === 'cancelled');
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      list = list.filter((o) => `${o.id}${o.product?.name || ''}${o.pharmacy?.name || ''}${o.status}`.toLowerCase().includes(q));
    }
    return list;
  }, [orders, orderFilter, orderSearch]);

  return (
    <>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-xs font-black px-6 py-3.5 rounded-full shadow-2xl animate-bounce-in flex items-center gap-2 border border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          {toast}
        </div>
      )}
      <div className="space-y-5 animate-fade-up">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-5.5 h-5.5 text-teal-600" />
            {t('طلباتي والشحنات')}
          </h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} طلب مسجل', [orders.length])}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm">
            {([
              { id: 'all' as const, label: t('الكل') },
              { id: 'active' as const, label: t('قيد المعالجة') },
              { id: 'delivered' as const, label: t('تم التسليم') },
              { id: 'cancelled' as const, label: t('ملغي') },
            ]).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOrderFilter(f.id)}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-black transition-all duration-300 ${orderFilter === f.id ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                style={orderFilter === f.id ? { backgroundColor: themeColors.primaryColor } : undefined}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder={t('ابحث في طلباتك...')}
              className="w-full ps-10 pe-3 py-2.5 rounded-2xl border border-slate-200/80 bg-white text-xs font-bold placeholder:font-bold focus:outline-none focus:ring-2 transition-shadow"
              style={{ ['--tw-ring-color' as string]: `${themeColors.primaryColor}40` }}
            />
          </div>
        </div>

        {ordersError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center shadow-sm">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <h3 className="font-black text-rose-700 text-base mb-1">{t('تعذر تحميل الطلبات')}</h3>
            <p className="text-xs text-rose-500 font-bold mb-4">{t('حدث خطأ أثناء تحميل طلباتك. تحقق من اتصالك وحاول مرة أخرى.')}</p>
            <button type="button" onClick={() => setOrdersRetryCount((c) => c + 1)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              {t('إعادة المحاولة')}
            </button>
          </div>
        ) : ordersLoading ? (
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-100 border border-slate-200 rounded-3xl h-36 skeleton" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-5 bg-teal-500/10 text-teal-600">
              <PackageCheck className="w-10 h-10" />
            </div>
            <h3 className="font-black text-slate-900 text-lg mb-1.5">{t('سجل الطلبات فارغ')}</h3>
            <p className="text-sm font-medium text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">{t('ابدأ بطلب أدويتك ومنتجات العناية بالبشرة والطفل لتتمكن من تتبع شحنتك لاحقاً.')}</p>
            <button onClick={() => navigate({ name: 'home' })} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-black shadow-md hover:scale-102 active:scale-95 transition-all" style={{ backgroundColor: themeColors.primaryColor }}>
              <Search className="w-4 h-4" />
              {t('تصفح الصيدليات المتاحة')}
            </button>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-sm">
            <Search className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="font-black text-slate-900 text-base mb-1">{t('لا توجد طلبات مطابقة')}</h3>
            <p className="text-xs text-slate-500 font-medium mb-4">{t('جرّب تعديل البحث أو الفلاتر الحالية.')}</p>
            <button type="button" onClick={() => { setOrderFilter('all'); setOrderSearch(''); }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-600 transition-colors">
              <X className="w-3.5 h-3.5" />
              {t('مسح الفلاتر')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map((order) => {
              const meta = STATUS_META[order.status] || STATUS_META.pending;
              const product = order.product;
              return (
                <div key={order.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row gap-5">
                    <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-2 relative">
                      {product?.image_url ? (
                        <img src={product.image_url} alt="" className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <Pill className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-base text-slate-900 truncate leading-snug">{lang === 'en' ? (product?.name_en || product?.name || '') : product?.name || t('منتج')}</p>
                          <p className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-teal-600" />
                            {lang === 'en' ? (order.pharmacy?.name_en || order.pharmacy?.name || '') : order.pharmacy?.name || t('صيدلية')}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border shadow-2xs ${meta.className}`}>
                          {meta.icon}
                          {t(meta.label)}
                        </span>
                      </div>
                      {featuresConfig.orderTracking && <OrderProgressTracker status={order.status} color={themeColors.primaryColor} />}
                      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[11px] font-bold text-slate-400 border-t border-slate-100/60 pt-3">
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" />
                          {t('الكمية:')}&nbsp;<strong className="text-slate-800 tabular-nums">{order.quantity}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate text-slate-700 max-w-[200px]">{order.address || t('عنوان غير محدد')}</span>
                        </span>
                        {order.payment_method && (
                          <span className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5" />
                            {t('طريقة الدفع:')}&nbsp;
                            <strong className="text-slate-800">
                              {order.payment_method === 'instapay' ? t('انستا باي') : order.payment_method === 'vodafone_cash' ? t('فودافون كاش') : order.payment_method}
                            </strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {localizedDate(order.created_at, lang, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {order.note && (
                        <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-medium text-slate-500 flex items-start gap-1.5 leading-relaxed">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: themeColors.primaryColor }} />
                          <span>{order.note}</span>
                        </div>
                      )}
                    </div>
                    <div className="sm:ms-auto flex sm:flex-col sm:items-end items-center gap-4 justify-between shrink-0 border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                      <div className="sm:text-end">
                        <p className="text-2xl font-black text-slate-900 leading-none tabular-nums" style={{ color: themeColors.primaryColor }}>
                          {Number(order.total_price).toFixed(2)}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 mt-1">{t('ج.م شامل الضريبة')}</p>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        {order.payment_method === 'online' && (order.payment_status ?? order.order_group?.payment_status ?? 'unpaid') !== 'paid' && (
                          <button
                            onClick={() => continuePayment(order)}
                            disabled={payLoadingGroup !== null}
                            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ backgroundColor: themeColors.secondaryColor }}
                          >
                            {payLoadingGroup === (order.order_group?.id || order.order_group_id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                            {payLoadingGroup === (order.order_group?.id || order.order_group_id) ? t('جاري تجهيز الدفع...') : t('كمّل الدفع')}
                          </button>
                        )}
                        {featuresConfig.orderTracking && (
                          <button onClick={() => onTrackingOrder(order)} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-black border shadow-2xs hover:bg-slate-50 active:scale-95 transition-all" style={{ borderColor: `${themeColors.primaryColor}50`, color: themeColors.primaryColor }}>
                            <Navigation className="w-3.5 h-3.5" />
                            {t('تتبع الشحنة')}
                          </button>
                        )}
                        {settings.contact_whatsapp && (
                          <button onClick={() => askPharmacistAboutOrder(order)} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-black border border-emerald-200 text-emerald-700 shadow-2xs hover:bg-emerald-50 active:scale-95 transition-all">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {t('اسأل الصيدلي')}
                          </button>
                        )}
                        {order.status === 'delivered' && (
                          <button onClick={() => onReviewOrder(order)} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all text-white bg-amber-500">
                            <Star className="w-3.5 h-3.5 fill-white" />
                            {t('تقييم الطلب')}
                          </button>
                        )}
                        {product && (
                          <button onClick={() => openOrder(product, order.pharmacy?.name)} className="px-4.5 py-2.5 rounded-xl text-white text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all" style={{ backgroundColor: themeColors.primaryColor }}>
                            {t('اطلب مجدداً')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {onlinePayment && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-3xl w-full max-w-xl flex flex-col overflow-hidden relative max-h-[94vh] bg-white">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${themeColors.primaryColor}14`, color: themeColors.primaryColor }}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-gray-900">{t('الدفع أونلاين')}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{t('أكمل دفعة طلبك عبر بوابة Paymob الآمنة — فيزا / ماستركارد / محافظ إلكترونية')}</p>
                </div>
                <button onClick={() => setOnlinePayment(null)} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center shrink-0">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-amber-700 leading-relaxed">{t('مبلغ الطلب ({0} ج.م). لن يتأكد طلبك حتى يكتمل الدفع.', [onlinePayment.amount.toFixed(2)])}</p>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: 'min(70vh, 560px)' }}>
                <iframe src={onlinePayment.hostedUrl} title={t('الدفع أونلاين')} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => window.open(onlinePayment.hostedUrl, '_blank', 'noopener,noreferrer')} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-xs font-bold transition-all hover:brightness-105 active:scale-[0.98]" style={{ backgroundColor: themeColors.primaryColor }}>
                  <ExternalLink className="w-4 h-4" />
                  {t('فتح الدفع في نافذة جديدة')}
                </button>
                <button type="button" onClick={handlePayChecking} disabled={payChecking} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60">
                  <RefreshCw className={`w-4 h-4 ${payChecking ? 'animate-spin' : ''}`} />
                  {payChecking ? t('جاري التحقق من الدفع...') : t('دفعت بالفعل — تحقق من الطلب')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
