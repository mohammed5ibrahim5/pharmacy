import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { supabase } from '@/lib/supabase';
import {
  fetchSubscriptions,
  updateSubscription,
  updateSubscriptionSchedule,
  cancelSubscription,
  baseProductPrice,
} from '@/lib/subscriptions';
import type { ChronicSubscription } from '@/lib/subscriptions';
import { localizedDate } from '@/lib/format';
import {
  CalendarClock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Trash2,
  MapPin,
  Package,
  Minus,
  Plus,
  Store,
  BadgePercent,
  Save,
  X,
  Wallet,
  Bell,
} from 'lucide-react';

export function SubscriptionsTab() {
  const { user } = useCustomer();
  const { themeColors, subscriptionConfig } = useSettings();
  const { t, lang } = useLanguage();

  const [items, setItems] = useState<ChronicSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editAddress, setEditAddress] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editReminderDays, setEditReminderDays] = useState(3);
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash_on_delivery');
  const [renewalHistory, setRenewalHistory] = useState<Array<{ id: string; total_price: number; status: string; created_at: string; note: string | null }>>([]);
  const [busy, setBusy] = useState(false);

  const discountPercent = subscriptionConfig.discountPercent ?? 5;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const list = await fetchSubscriptions(user.id);
      if (!cancelled) {
        setItems(list);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void supabase.from('order_groups').select('id, total_price, status, created_at, note').eq('customer_id', user.id).ilike('note', '%تجديد اشتراك%').order('created_at', { ascending: false }).limit(30).then(({ data }) => setRenewalHistory((data || []) as typeof renewalHistory));
  }, [user, items.length]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const startEdit = (s: ChronicSubscription) => {
    setEditing(s.id);
    setEditQty(s.quantity);
    setEditAddress(s.address || '');
    setEditDate(new Date(s.next_run_at).toISOString().slice(0, 16));
    setEditReminderDays(s.renewal_reminder_days ?? 3);
    setEditPaymentMethod(s.payment_method || 'cash_on_delivery');
    setConfirming(null);
  };

  const saveEdit = async (id: string) => {
    if (!editAddress.trim() || editQty < 1) return;
    const nextRun = new Date(editDate);
    if (Number.isNaN(nextRun.getTime()) || nextRun.getTime() <= Date.now()) {
      showToast(t('اختر موعد تجديد قادماً وصالحاً.'));
      return;
    }
    setBusy(true);
    const { error } = await updateSubscription(id, { quantity: editQty, address: editAddress.trim() });
    if (!error) {
      const schedule = await updateSubscriptionSchedule(id, nextRun.toISOString(), editReminderDays, editPaymentMethod);
      if (schedule.error) {
        setBusy(false);
        showToast(t('تعذر تحديث موعد التجديد أو وسيلة الدفع.'));
        return;
      }
    }
    setBusy(false);
    if (error) {
      showToast(t('تعذر الحفظ، حاول مرة أخرى.'));
      return;
    }
    setEditing(null);
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: editQty, address: editAddress.trim(), next_run_at: nextRun.toISOString(), renewal_reminder_days: editReminderDays, payment_method: editPaymentMethod } : s)));
    showToast(t('تم تحديث الاشتراك.'));
  };

  const toggleActive = async (s: ChronicSubscription) => {
    setBusy(true);
    const { error } = await updateSubscription(s.id, { active: !s.active });
    setBusy(false);
    if (error) {
      showToast(t('تعذر تحديث الحالة، حاول مرة أخرى.'));
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
    setConfirming(null);
    showToast(s.active ? t('تم إيقاف الاشتراك مؤقتاً.') : t('تم إعادة تفعيل الاشتراك.'));
  };

  const doCancel = async (id: string) => {
    setBusy(true);
    const { error } = await cancelSubscription(id);
    setBusy(false);
    if (error) {
      showToast(t('تعذر إلغاء الاشتراك، حاول مرة أخرى.'));
      return;
    }
    setItems((prev) => prev.filter((s) => s.id !== id));
    setConfirming(null);
    showToast(t('تم إلغاء الاشتراك.'));
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="h-9 w-48 rounded-2xl skeleton" />
        {[0, 1].map((i) => (
          <div key={i} className="h-40 rounded-3xl skeleton" />
        ))}
      </div>
    );
  }

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
            <CalendarClock className="w-5.5 h-5.5" style={{ color: themeColors.primaryColor }} />
            {t('اشتراكاتي الشهرية')}
          </h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">
            {t('{0} اشتراك نشط', [items.filter((s) => s.active).length])}
          </span>
        </div>

        <div
          className="rounded-[2.5rem] text-white relative overflow-hidden p-6 sm:p-8 shadow-xl border border-white/10"
          style={{ background: `linear-gradient(135deg, ${themeColors.secondaryColor}, ${themeColors.primaryColor})` }}
        >
          <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
          <div className="relative flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
              <CalendarClock className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black text-white/80 uppercase tracking-wider mb-1">{t('اشتراك الأدوية المزمنة')}</p>
              <p className="text-xl sm:text-2xl font-black">{t('دواك يوصل كل شهر تلقائياً')}</p>
              <p className="text-xs font-bold text-white/85 mt-1.5 leading-relaxed">
                {t('خصم دائم {0}% + تجديد تلقائي + إشعار قبل كل طلب. ملائم للسكري والضغط والأدوية الدورية.', [discountPercent])}
              </p>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
            <CalendarClock className="w-12 h-12 mx-auto mb-4" style={{ color: themeColors.primaryColor, opacity: 0.35 }} />
            <h4 className="font-black text-slate-900 text-base mb-1">{t('لا توجد اشتراكات بعد')}</h4>
            <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
              {t('اختر أحد الأدوية الدورية من صفحات المنتجات واضغط "اشترك شهرياً" لتتولى تجديده تلقائياً كل شهر.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((s) => {
              const subName = lang === 'en' ? (s.product?.name_en || s.product?.name || t('منتج')) : (s.product?.name || t('منتج'));
              const perUnit = s.product ? baseProductPrice(s.product) * (1 - discountPercent / 100) : 0;
              const monthly = perUnit * s.quantity;
              const nextDate = localizedDate(s.next_run_at, lang, { year: 'numeric', month: 'long', day: 'numeric' });
              return (
                <div key={s.id} className={`bg-white rounded-3xl border shadow-2xs hover:shadow-sm transition-shadow overflow-hidden ${s.active ? 'border-slate-200/80' : 'border-slate-200/60 opacity-80'}`}>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      {s.product?.image_url ? (
                        <img src={s.product.image_url} alt={subName} className="w-16 h-16 rounded-2xl object-contain border border-gray-100 bg-gray-50 p-1.5 shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                          <Package className="w-7 h-7" style={{ color: themeColors.priceColor, opacity: 0.4 }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 truncate">{subName}</h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${s.active ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-slate-500 bg-slate-100 border border-slate-200'}`}
                          >
                            {s.active ? <PlayCircle className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
                            {s.active ? t('نشط') : t('متوقف')}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
                          {s.product?.for_all_pharmacies ? t('جميع الصيدليات') : (s.pharmacy?.name || t('صيدلية'))}
                        </p>
                        {editing === s.id ? (
                          <div className="mt-3 space-y-2.5">
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-black text-slate-500">{t('الكمية')}</span>
                              <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => setEditQty((q) => Math.max(1, q - 1))} disabled={editQty <= 1} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center">
                                  <Minus className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                                <span className="min-w-[2rem] text-center text-sm font-black" style={{ color: themeColors.priceColor }}>{editQty}</span>
                                <button type="button" onClick={() => setEditQty((q) => q + 1)} className="w-7 h-7 rounded-lg text-white flex items-center justify-center" style={{ backgroundColor: themeColors.priceColor }}>
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <input
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              placeholder={t('عنوان الاستلام')}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 resize-none"
                              style={{ ['--tw-ring-color' as never]: `${themeColors.primaryColor}55` }}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <label className="text-[11px] font-black text-slate-500">{t('موعد التجديد')}<input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold" /></label>
                              <label className="text-[11px] font-black text-slate-500">{t('التذكير')}<select value={editReminderDays} onChange={(e) => setEditReminderDays(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold"><option value={0}>{t('يوم التجديد')}</option><option value={1}>{t('قبل يوم')}</option><option value={3}>{t('قبل 3 أيام')}</option><option value={7}>{t('قبل أسبوع')}</option></select></label>
                              <label className="text-[11px] font-black text-slate-500">{t('الدفع')}<select value={editPaymentMethod} onChange={(e) => setEditPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold"><option value="cash_on_delivery">{t('عند الاستلام')}</option><option value="vodafone_cash">{t('فودافون كاش')}</option><option value="instapay">{t('انستا باي')}</option></select></label>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => saveEdit(s.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-black transition-all active:scale-95 disabled:opacity-50"
                                style={{ backgroundColor: themeColors.primaryColor }}
                              >
                                <Save className="w-3.5 h-3.5" />
                                {t('حفظ')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-black transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                {t('إلغاء')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
                              <span className="truncate">{s.address || t('لا يوجد عنوان — أضف عنواناً')}</span>
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Bell className="w-3 h-3" />{t('تذكير قبل {0} يوم', [s.renewal_reminder_days ?? 3])}<Wallet className="w-3 h-3 ms-2" />{s.payment_method === 'cash_on_delivery' ? t('عند الاستلام') : s.payment_method === 'vodafone_cash' ? t('فودافون كاش') : t('انستا باي')}</p>
                          </div>
                        )}
                      </div>

                      <div className="text-end shrink-0">
                        <p className="text-lg font-black tabular-nums" style={{ color: themeColors.priceColor }}>
                          {monthly.toFixed(2)}
                          <span className="text-[10px] font-bold text-slate-400 ms-1">EGP/{t('شهر')}</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{t('مع تجديدِ كل {0} يوم', [s.interval_days])}</p>
                      </div>
                    </div>

                    {!editing && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                          <BadgePercent className="w-3.5 h-3.5" style={{ color: themeColors.accentColor }} />
                          {t('خصم دائم {0}%')}{' '}
                          <span className="text-slate-400">•</span>{' '}
                          <CalendarClock className="w-3.5 h-3.5" style={{ color: themeColors.primaryColor }} />
                          {s.active ? t('التجديد القادم: {0}', [nextDate]) : t('متوقف — أعد التفعيل للاستمرار')}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {confirming === s.id ? (
                            <>
                              <span className="text-[11px] font-black text-slate-500 px-1">{t('متأكد؟')}</span>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => doCancel(s.id)}
                                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-black transition-colors disabled:opacity-50"
                              >
                                {t('نعم، احذف')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirming(null)}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-black transition-colors"
                              >
                                {t('لا')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => startEdit(s)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-black transition-colors disabled:opacity-50"
                              >
                                <Package className="w-3.5 h-3.5" />
                                {t('تعديل')}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleActive(s)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-[11px] font-black transition-all active:scale-95 disabled:opacity-50"
                                style={{ backgroundColor: s.active ? themeColors.accentColor : themeColors.primaryColor }}
                              >
                                {s.active ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                {s.active ? t('إيقاف مؤقت') : t('إعادة تفعيل')}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => { setConfirming(s.id); setEditing(null); }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-black transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t('إلغاء')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {renewalHistory.length > 0 && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><CalendarClock className="w-4 h-4" style={{ color: themeColors.primaryColor }} />{t('تاريخ تجديدات الاشتراك')}</h3>
            <div className="mt-3 space-y-2">{renewalHistory.map((renewal) => <div key={renewal.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="font-bold text-slate-500">{localizedDate(renewal.created_at, lang, { year: 'numeric', month: 'short', day: 'numeric' })}</span><span className="font-black text-slate-800">{Number(renewal.total_price || 0).toFixed(2)} EGP</span><span className="font-bold text-slate-500">{renewal.status}</span></div>)}</div>
          </div>
        )}
      </div>
    </>
  );
}