import { useEffect, useState } from 'react';
import { Calculator, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { DEFAULT_DOSE_RULES, fetchDoseRules, type DoseRule } from '@/lib/doseRules';

interface Props {
  product: Product;
  onOpenCalculator: (key?: string) => void;
}

/** plain-text normalization used for matching localized names */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^a-z0-9\u0600-\u06FF]/g, '');
}

function ruleMatches(rule: DoseRule, texts: string[]): boolean {
  const keys = [normalize(rule.nameAr), normalize(rule.nameEn)].filter(Boolean);
  for (const raw of texts) {
    const nt = normalize(raw);
    if (!nt) continue;
    for (const k of keys) {
      if (k && (nt.includes(k) || k.includes(nt))) return true;
    }
  }
  return false;
}

export function DoseGuideSection({ product, onOpenCalculator }: Props) {
  const { t, lang } = useLanguage();
  const { themeColors } = useSettings();
  const [rules, setRules] = useState<DoseRule[]>(DEFAULT_DOSE_RULES);

  useEffect(() => {
    let alive = true;
    fetchDoseRules().then(({ rules: dbRules }) => {
      if (alive && dbRules.length > 0) setRules(dbRules);
    });
    return () => { alive = false; };
  }, []);

  const candidates = [product.active_ingredient, product.name, product.name_en]
    .filter((x): x is string => !!x && x.trim() !== '');

  const med = rules.find((r) => ruleMatches(r, candidates));

  if (!med) return null;

  const maxDaily = med.maxDailyMgPerKg !== undefined && med.maxDailyMgPerKg !== null
    ? `${med.maxDailyMgPerKg} ${lang === 'en' ? 'mg/kg' : 'مجم/كجم'}`
    : undefined;

  const doseLabel = med.basis === 'perDose'
    ? t('مجم/كجم لكل جرعة')
    : t('مجم/كجم يومياً ÷ {0}', [med.perDay]);

  const formLabels = med.forms.map((f) => f.labelAr);

  return (
    <div className="rounded-2xl border overflow-hidden animate-fade-in" style={{ borderColor: `${themeColors.primaryColor}30`, backgroundColor: `${themeColors.primaryColor}07` }}>
      <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ backgroundColor: `${themeColors.primaryColor}0f` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${themeColors.primaryColor}18`, color: themeColors.primaryColor }}>
          <Calculator className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-black text-gray-900">{t('دليل الجرعات')}</h3>
          <p className="text-[10px] font-bold text-gray-500 truncate">{t('إرشادات الجرعة الآمنة لتجنب الجرعة الزائدة')}</p>
        </div>
      </div>

      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black text-gray-600">{t('الجرعة')}</span>
          <span className="text-xs font-black" style={{ color: themeColors.priceColor }}>
            {med.low === med.high ? med.low : `${med.low}–${med.high}`} {doseLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black text-gray-600">{t('التكرار')}</span>
          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
            {t('كل {0} ساعات • {1} مرات يومياً', [med.intervalH, med.perDay])}
          </span>
        </div>

        {maxDaily && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-gray-600">{t('الحد الأقصى يومياً')}</span>
            <span className="text-xs font-black text-amber-600">{maxDaily}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black text-gray-600">{t('مناسب للأطفال')}</span>
          <span className="text-xs font-bold text-gray-800">
            {med.minAgeMonths > 0
              ? t('من سن {0} أشهر', [med.minAgeMonths])
              : t('من الولادة بإشراف طبي')}
          </span>
        </div>

        {formLabels.length > 0 && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-black text-gray-600 shrink-0">{t('الأشكال المتاحة')}</span>
            <span className="text-[11px] font-semibold text-gray-700 text-end leading-relaxed">{formLabels.map((f) => t(f)).join(' • ')}</span>
          </div>
        )}

        {med.note && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
            <p className="text-[11px] font-bold text-amber-800 leading-relaxed">{t(med.note)}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => onOpenCalculator(med.key)}
          className="w-full flex items-center justify-center gap-2 mt-1 py-2.5 rounded-xl text-xs font-black transition-all active:scale-[0.98] shadow-xs"
          style={{ background: `linear-gradient(135deg, ${themeColors.priceColor}, ${themeColors.primaryColor})`, color: '#fff' }}
        >
          <Calculator className="w-4 h-4" />
          {t('احسب جرعة الطفل لهذا الدواء')}
        </button>

        <div className="flex items-start gap-1.5 px-0.5 pt-0.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
          <p className="text-[10px] font-bold text-gray-400 leading-relaxed">
            {t('هذه المعلومات إرشادية، وتُعتمد بعد استشارة الصيدلي أو الطبيب')}
          </p>
        </div>
      </div>
    </div>
  );
}