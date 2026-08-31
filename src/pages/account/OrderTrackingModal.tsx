import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabase';
import { localizedDate } from '@/lib/format';
import { X, Navigation, CheckCircle2, Phone } from 'lucide-react';
import { ORDER_TRACK_STEPS } from './types';
import type { OrderRecord } from './types';

export function OrderTrackingModal({ order, onClose }: { order: OrderRecord; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const { themeColors } = useSettings();
  const [status, setStatus] = useState(order.status);
  const [updatedAt, setUpdatedAt] = useState(order.created_at);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, updated_at')
        .eq('id', order.id)
        .maybeSingle();
      if (!cancelled && data) {
        setStatus(data.status);
        if (data.updated_at) setUpdatedAt(data.updated_at);
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [order.id]);

  const currentIdx = ORDER_TRACK_STEPS.findIndex((s) => s.key === status);
  const current = currentIdx === -1 ? 0 : currentIdx;
  const cancelled = status === 'cancelled';

  const liveMessages: Record<string, string> = {
    pending: t('طلبك قيد المراجعة، سنؤكد الدفع خلال دقائق.'),
    confirmed: t('تم تأكيد الدفع، نجهز طلبك الآن.'),
    shipped: t('السائق في الطريق إليك الآن، استعد لاستلام طلبك.'),
    delivered: t('تم تسليم طلبك بنجاح. شكراً لثقتك بنا!'),
  };

  const progress = Math.min(100, Math.round((current / (ORDER_TRACK_STEPS.length - 1)) * 100));

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-3xl p-6 sm:p-7 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600">
              <Navigation className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">{t('تتبع الطلب')}</h3>
              <p className="text-xs text-slate-400 font-bold">{t('تحديث مباشر كل 5 ثوانٍ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-1.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${cancelled ? 'bg-rose-400' : ''}`}
            style={!cancelled ? { width: `${progress}%`, backgroundColor: themeColors.primaryColor } : { width: '100%' }}
          />
        </div>
        <p className={`text-xs font-black mb-5 ${cancelled ? 'text-rose-500' : 'text-slate-500'}`}>
          {cancelled ? t('تم إلغاء هذا الطلب') : t('حالة الطلب الحالية: {0}', [t(ORDER_TRACK_STEPS[current].label)])}
        </p>

        {!cancelled && (
          <div className="mb-5 rounded-2xl p-4 flex items-start gap-3.5 animate-pulse-soft" style={{ backgroundColor: `${themeColors.primaryColor}0c` }}>
            <span className="flex items-center justify-center relative flex w-3.5 h-3.5 mt-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: themeColors.primaryColor }} />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5" style={{ backgroundColor: themeColors.primaryColor }} />
            </span>
            <p className="text-xs font-extrabold text-slate-800 leading-relaxed">{liveMessages[status] || liveMessages.pending}</p>
          </div>
        )}

        <div className="space-y-2 mb-6">
          {ORDER_TRACK_STEPS.map((step, i) => {
            const done = !cancelled && i <= current;
            return (
              <div key={step.key} className="flex items-center gap-3.5 py-2.5 px-3 rounded-2xl transition-colors hover:bg-slate-50">
                <span
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-all ${
                    done ? 'text-white border-transparent shadow-md' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                  style={done ? { backgroundColor: themeColors.primaryColor } : {}}
                >
                  {done ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-black ${done ? 'text-slate-900' : 'text-slate-400'}`}>{t(step.label)}</p>
                  <p className={`text-xs font-bold ${done ? 'text-slate-500' : 'text-slate-300'}`}>
                    {i === current && !cancelled
                      ? t('الحالة الحالية')
                      : i < current
                        ? t('تم')
                        : t('قادم')}
                  </p>
                </div>
                {done && <CheckCircle2 className="w-4.5 h-4.5" style={{ color: themeColors.primaryColor }} />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4.5 space-y-2.5 text-xs font-bold text-slate-600">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('المنتج')}</span>
            <span className="font-black text-slate-800 text-end">{lang === 'en' ? (order.product?.name_en || order.product?.name || '') : order.product?.name || t('منتج')}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('الصيدلية')}</span>
            <span className="font-black text-slate-800 text-end">{lang === 'en' ? (order.pharmacy?.name_en || order.pharmacy?.name || '') : order.pharmacy?.name || t('صيدلية')}</span>
          </div>
          {order.family_member && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">{t('الطلب لأجل')}</span>
              <span className="font-black text-slate-800 flex items-center gap-1">
                {order.family_member.name}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('العنوان')}</span>
            <span className="font-black text-slate-800 text-end">{order.address || t('غير محدد')}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('الإجمالي')}</span>
            <span className="font-black text-slate-900" style={{ color: themeColors.primaryColor }}>{Number(order.total_price).toFixed(2)} {t('ج.م')}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('آخر تحديث')}</span>
            <span className="font-black text-slate-800">{localizedDate(updatedAt, lang, { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {order.pharmacy?.phone && (
          <a
            href={`tel:${order.pharmacy.phone}`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white text-sm font-black shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
            style={{ backgroundColor: themeColors.primaryColor }}
          >
            <Phone className="w-4.5 h-4.5" />
            {t('تواصل مع الصيدلية')}
          </a>
        )}
      </div>
    </div>
  );
}
