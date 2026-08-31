import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { fetchLoyaltyBalance, fetchLoyaltyHistory } from '@/lib/loyalty';
import { localizedDate } from '@/lib/format';
import { Sparkles, PackageCheck, Wallet, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { LoyaltyTransaction } from '@/types';

export function RewardsTab() {
  const { user } = useCustomer();
  const { themeColors, loyaltyConfig } = useSettings();
  const { t, lang } = useLanguage();

  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTransaction[]>([]);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadLoyalty = async () => {
      const [balance, history] = await Promise.all([
        fetchLoyaltyBalance(user.id),
        fetchLoyaltyHistory(user.id),
      ]);
      if (!cancelled) {
        setLoyaltyPoints(balance);
        setLoyaltyHistory(history);
      }
    };
    loadLoyalty();
    return () => { cancelled = true; };
  }, [user]);

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
            <Sparkles className="w-5.5 h-5.5 text-amber-500" />
            {t('نقاطي ومكافآتي')}
          </h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} نقطة صالحة للاستخدام', [loyaltyPoints])}</span>
        </div>

        <div
          className="rounded-[2.5rem] text-white relative overflow-hidden p-6 sm:p-8 shadow-xl border border-white/10"
          style={{ background: `linear-gradient(135deg, ${themeColors.accentColor}, #d97706)` }}
        >
          <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
          <div className="absolute -bottom-16 -start-16 w-56 h-56 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute -top-16 -end-16 w-56 h-56 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
              <Sparkles className="w-8 h-8 text-amber-200 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black text-amber-100 uppercase tracking-wider mb-1">{t('رصيد نقاط المكافآت الحالي')}</p>
              <p className="text-4xl font-black leading-none tabular-nums">{loyaltyPoints}</p>
              <p className="text-xs font-bold text-amber-100/90 mt-2 leading-relaxed">
                {t('تبقت لك {0} نقطة إضافية للوصول للحد الأدنى وتطبيق خصم مباشر بقيمة {1} ج.م على طلبك القادم.', [Math.max(0, loyaltyConfig.redeemThreshold - loyaltyPoints), loyaltyConfig.redeemValue])}
              </p>
            </div>
            <div className="sm:ms-auto bg-white/15 backdrop-blur-md rounded-2xl px-5 py-4 border border-white/20 text-center shrink-0">
              <p className="text-[10px] font-black text-amber-100/90 uppercase tracking-wider mb-1">{t('التحويل المباشر')}</p>
              <p className="text-xl font-black">{t('1 نقطة لكل {0} ج.م', [loyaltyConfig.pointsPerPound])}</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{t('{0} نقاط مع كل أوردر', [loyaltyConfig.pointsPerOrder])}</p>
              <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">{t('تضاف تلقائياً بعد تأكيد واستلام الشحنة')}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-teal-500/10 text-teal-600">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{t('استبدال {0} نقطة = {1} ج.م خصم', [loyaltyConfig.redeemThreshold, loyaltyConfig.redeemValue])}</p>
              <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">{t('اختر تطبيق الخصم بضغطة زر عند الدفع')}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-base font-black text-slate-955 mb-3.5 flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            {t('سجل حركات النقاط والمكافآت')}
          </h3>
          {loyaltyHistory.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
              <Sparkles className="w-12 h-12 mx-auto text-amber-300 mb-4" />
              <h4 className="font-black text-slate-900 text-base mb-1">{t('سجل المكافآت فارغ')}</h4>
              <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">{t('أكمل طلبك الأول عبر الموقع وسوف تبدأ بالحصول على نقاط ترحيبية مكافأة لك.')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {loyaltyHistory.map((tx) => (
                <div key={tx.id} className="bg-white rounded-2xl border border-slate-200/80 p-4.5 flex items-center justify-between gap-4 shadow-2xs hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.points > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-snug">{tx.reason}</p>
                      <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                        {localizedDate(tx.created_at, lang, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-base font-black tabular-nums ${tx.points > 0 ? 'text-amber-600' : 'text-rose-500'}`}>
                    {tx.points > 0 ? `+${tx.points}` : tx.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
