import { useState, useEffect } from 'react';
import { BadgePercent, X, Copy, Check, ShoppingBag, Ticket } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useCountdown } from '@/hooks/useCountdown';

const STORAGE_KEY = 'pharmacy_welcome_popup_seen';
const OFFER_CODE = 'WELCOME10';

export function WelcomePopup() {
  const { themeColors, storeConfig } = useSettings();
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const endOfDay = (() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  })();
  const countdown = useCountdown(open ? endOfDay : null);

  useEffect(() => {
    if (!storeConfig.purchasesEnabled) return;
    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (seen) return;
    const timer = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(STORAGE_KEY, '1');
    }, 4000);
    return () => clearTimeout(timer);
  }, [storeConfig.purchasesEnabled]);

  if (!open || !storeConfig.purchasesEnabled) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(OFFER_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in" onClick={() => setOpen(false)}>
      <div
        className="rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-fade-up border border-gray-100"
        style={{ backgroundColor: themeColors.modalBodyBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div
          className="relative p-6 text-center text-white overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${themeColors.modalHeaderBg}, ${themeColors.priceColor})` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:18px_18px] opacity-60" />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-3 animate-float shadow-lg">
              <BadgePercent className="w-8 h-8 text-white" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/80">عرض ترحيبي خاص</p>
            <h3 className="text-2xl font-black mt-1">خصم 10% على طلبك الأول</h3>
            <p className="text-xs text-white/85 font-bold mt-1.5">ادخل الكود عند إتمام الطلب واستفد بالخصم</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Countdown */}
          {countdown && (
            <div className="flex items-center justify-center gap-2 mb-5">
              {[
                { value: countdown.hours, label: 'ساعة' },
                { value: countdown.minutes, label: 'دقيقة' },
                { value: countdown.seconds, label: 'ثانية' },
              ].map((unit, i) => (
                <div key={unit.label} className="flex items-center gap-2">
                  <div className="bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-center">
                    <p className="text-lg font-black text-slate-800 tabular-nums leading-none">{String(unit.value).padStart(2, '0')}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">{unit.label}</p>
                  </div>
                  {i < 2 && <span className="text-gray-300 font-black">:</span>}
                </div>
              ))}
            </div>
          )}

          {/* Offer code */}
          <div className="flex items-center justify-between gap-2 border-2 border-dashed rounded-2xl p-3" style={{ borderColor: `${themeColors.accentColor}50`, backgroundColor: `${themeColors.accentColor}08` }}>
            <div className="flex items-center gap-2 min-w-0">
              <Ticket className="w-5 h-5 shrink-0" style={{ color: themeColors.accentColor }} />
              <span className="font-black text-lg tracking-widest text-slate-800" dir="ltr">{OFFER_CODE}</span>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-black transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{ backgroundColor: themeColors.accentColor }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'تم النسخ' : 'نسخ الكود'}
            </button>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              setOpen(false);
              navigate({ name: 'search', query: '' });
            }}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 12px 28px -8px ${themeColors.priceColor}99` }}
          >
            <ShoppingBag className="w-4 h-4" />
            ابدأ التسوق الآن
          </button>
          <button
            onClick={() => setOpen(false)}
            className="mt-3 w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            لاحقاً، لن أشتري الآن
          </button>
        </div>
      </div>
    </div>
  );
}
