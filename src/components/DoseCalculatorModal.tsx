import { useState, useEffect } from 'react';
import { X, Baby, Scale, Calculator, ShieldAlert, CheckCircle2, Info, Sparkles, Droplets, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { DEFAULT_DOSE_RULES, fetchDoseRules, type DoseRule } from '@/lib/doseRules';

const WEIGHT_HINTS = [
  { min: 0, max: 6, hint: 'رضيع 0-6 أشهر' },
  { min: 6, max: 9, hint: 'رضيع 6-12 شهر' },
  { min: 9, max: 12, hint: 'طفل 1-2 سنة' },
  { min: 12, max: 16, hint: 'طفل 2-4 سنوات' },
  { min: 16, max: 22, hint: 'طفل 4-6 سنوات' },
  { min: 22, max: 30, hint: 'طفل 6-10 سنوات' },
  { min: 30, max: 42, hint: 'طفل 10-13 سنة' },
  { min: 42, max: 999, hint: 'مراهق 13+ سنة' },
];

/** rough expected weight (kg) from age — standard pediatric estimation formulas */
const estimateWeightKg = (years: number): number | null => {
  const months = years * 12;
  if (months <= 0) return null;
  if (months < 12) return Math.round(((months + 9) / 2) * 10) / 10;
  if (years <= 10) return Math.round((2 * years + 8) * 10) / 10;
  return Math.round((3 * years + 7) * 10) / 10;
};

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const fmtRange = (lo: number, hi: number) => (lo === hi ? fmtNum(hi) : `${fmtNum(lo)} - ${fmtNum(hi)}`);
/** round ml to the nearest 0.25 ml (syringe graduation) */
const roundQuarter = (n: number) => Math.max(0.25, Math.round(n * 4) / 4);
const trimNum = (n: number) => String(parseFloat(n.toFixed(2)));

export function DoseCalculatorModal({ onClose, initialKey }: { onClose: () => void; initialKey?: string }) {
  const { t } = useLanguage();
  const { themeColors } = useSettings();
  const [rules, setRules] = useState<DoseRule[]>(DEFAULT_DOSE_RULES);
  const [medKey, setMedKey] = useState(initialKey || 'paracetamol');
  const [formId, setFormId] = useState(() => {
    const key = initialKey || 'paracetamol';
    return DEFAULT_DOSE_RULES.find((r) => r.key === key)?.forms[0]?.id ?? DEFAULT_DOSE_RULES[0].forms[0].id;
  });
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');

  useEffect(() => {
    let alive = true;
    fetchDoseRules().then(({ rules: dbRules }) => {
      if (!alive || dbRules.length === 0) return;
      setRules(dbRules);
      if (!dbRules.some((r) => r.key === medKey)) {
        setMedKey(dbRules[0].key);
        setFormId(dbRules[0].forms[0]?.id ?? '');
      }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const med = rules.find((m) => m.key === medKey) || rules[0];
  const form = med?.forms.find((f) => f.id === formId) || med?.forms[0];
  const w = parseFloat(weight);
  const hasWeight = !Number.isNaN(w) && w > 0;
  const a = parseFloat(age);
  const years = !Number.isNaN(a) && a >= 0 ? a : null;
  const ageMonths = years !== null ? years * 12 : null;

  // if weight is unknown, estimate it from age so the calculator still works
  const estimatedWeight = !hasWeight && years !== null ? estimateWeightKg(years) : null;
  const effW = hasWeight ? w : estimatedWeight;
  const hasCalc = effW !== null && effW > 0;

  const selectMed = (key: string) => {
    const next = rules.find((m) => m.key === key) || rules[0];
    setMedKey(key);
    setFormId(next.forms[0]?.id ?? '');
  };

  // ---- age-based adjustments (real clinical rules) ----
  const advisories: string[] = [];
  let lo = med.low;
  let hi = med.high;
  /** absolute mg per single dose (adult dosing override) */
  let absPerDose = false;
  let capSingleMg = med.maxSingleMg ?? null;

  if (years !== null) {
    if (med.key === 'ibuprofen') {
      if (years < 2) advisories.push('للأطفال تحت السنتين يُعطى الإيبوبروفين بإشراف طبي فقط');
      if (years >= 12) {
        absPerDose = true;
        lo = 200;
        hi = 400;
      }
    }
    if (med.key === 'paracetamol' && years < 1) advisories.push('تحت سنة: ابدأ بأقل جرعة واستشر الصيدلي أو الطبيب');
    if (med.key === 'cetirizine' && years >= 2 && years < 6) capSingleMg = Math.min(capSingleMg ?? Infinity, 5);
  }

  // ---- dose math ----
  let singleLo = 0;
  let singleHi = 0;
  let maxDaily: string | null = null;
  let volumeLine: { lo: number; hi: number } | null = null;
  const showCap = capSingleMg !== null && capSingleMg !== (med.maxSingleMg ?? null);

  if (hasCalc && effW !== null) {
    if (absPerDose) {
      singleLo = lo;
      singleHi = hi;
      maxDaily = `${fmtNum(Math.min(hi * med.perDay, med.maxDailyMgPerKg ? med.maxDailyMgPerKg * 30 : Infinity))} ${t('مجم')}`;
    } else if (med.basis === 'perDose') {
      singleLo = effW * lo;
      singleHi = effW * hi;
      maxDaily = `${fmtNum(Math.min(effW * hi, med.maxDailyMgPerKg ? effW * med.maxDailyMgPerKg : Infinity))} ${t('مجم')}`;
    } else {
      singleLo = (effW * lo) / med.perDay;
      singleHi = (effW * hi) / med.perDay;
      maxDaily = `${fmtRange(effW * lo, effW * hi)} ${t('مجم')}`;
    }
    if (capSingleMg) singleHi = Math.min(singleHi, capSingleMg);

    const conc = form.mgPer5ml ? form.mgPer5ml / 5 : form.mgPerMl;
    if (conc) volumeLine = { lo: roundQuarter(singleLo / conc), hi: roundQuarter(singleHi / conc) };
  }

  // ---- validations ----
  const tooYoung = ageMonths !== null && ageMonths < med.minAgeMonths;
  let mismatch = false;
  if (hasWeight && ageMonths !== null) {
    const est = ageMonths < 12 ? (ageMonths + 9) / 2 : ageMonths <= 120 ? 2 * (ageMonths / 12) + 8 : 3 * (ageMonths / 12) + 7;
    mismatch = est > 3 && Math.abs(w - est) / est > 0.5;
  }

  const hint = hasCalc && effW !== null ? (WEIGHT_HINTS.find((h) => effW >= h.min && effW < h.max)?.hint || '') : '';

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${themeColors.primaryColor}12`, color: themeColors.primaryColor }}>
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">{t('حاسبة جرعات الأطفال')}</h3>
              <p className="text-[11px] text-gray-500 font-bold">{t('حسب الوزن والعمر والتركيز')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors" title={t('إغلاق')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('اختر الدواء')}</label>
            <select
              value={medKey}
              onChange={(e) => selectMed(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
            >
              {rules.map((m) => (
                <option key={m.key} value={m.key}>{t(m.nameAr)}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 font-bold mt-1">{med.nameEn} {med.note ? ` • ${t(med.note)}` : ''}</p>
          </div>

          {med.forms.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('التركيز المتاح')}</label>
              <div className="flex flex-wrap gap-1.5">
                {med.forms.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormId(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all active:scale-95 ${f.id === formId ? 'text-white border-transparent' : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                    style={f.id === formId ? { backgroundColor: themeColors.primaryColor } : undefined}
                  >
                    {t(f.labelAr)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('الوزن (كجم) *')}</label>
              <div className="relative" dir="ltr">
                <Scale className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="مثال: 12"
                  className="w-full ps-4 pe-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('العمر (اختياري)')}</label>
              <input
                type="number"
                min="0"
                max="18"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('بالسنوات')}
                dir="ltr"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
              />
            </div>
          </div>

          {hint && (
            <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
              <Baby className="w-3.5 h-3.5" style={{ color: themeColors.primaryColor }} />
              {t(hint)}
            </p>
          )}

          {tooYoung && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs font-black text-red-700 leading-relaxed">
                {t('تحذير: هذا الدواء غير مناسب للأطفال تحت {0}', [med.minAgeMonths >= 24 ? t('{0} سنتين', [Math.round(med.minAgeMonths / 12)]) : t('{0} أشهر', [med.minAgeMonths])])}
              </p>
            </div>
          )}

          {mismatch && !tooYoung && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2 animate-fade-in">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-xs font-bold text-amber-800 leading-relaxed">{t('الوزن المدخل غير معتاد لهذا العمر — راجع الأرقام مرة أخرى')}</p>
            </div>
          )}

          {advisories.map((adv) => (
            <div key={adv} className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2 animate-fade-in">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-xs font-bold text-amber-800 leading-relaxed">{t(adv)}</p>
            </div>
          ))}

          {hasCalc ? (
            <div className="rounded-2xl p-4 space-y-3 animate-fade-in" style={{ backgroundColor: `${themeColors.primaryColor}10` }}>
              {estimatedWeight !== null && (
                <div className="flex items-center gap-1.5 rounded-xl bg-white/60 px-2.5 py-1.5">
                  <Baby className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.primaryColor }} />
                  <p className="text-[10px] font-black" style={{ color: themeColors.primaryColor }}>
                    {t('مفيش وزن؟ حسبناه تقريبياً من العمر: ≈ {0} كجم', [fmtNum(estimatedWeight)])}
                  </p>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: themeColors.primaryColor }} />
                <div className="flex-1">
                  <p className="text-xs font-black text-gray-900">{t('الجرعة الواحدة لـ {0}', [t(med.nameAr)])}</p>
                  <p className="text-lg font-black leading-tight" style={{ color: themeColors.primaryColor }}>
                    {fmtRange(Math.round(singleLo * 10) / 10, Math.round(singleHi * 10) / 10)} {t('مجم')}
                  </p>

                  {volumeLine && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2">
                      <Droplets className="w-4 h-4 shrink-0" style={{ color: themeColors.secondaryColor || themeColors.primaryColor }} />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900">
                          ≈ {volumeLine.lo === volumeLine.hi ? trimNum(volumeLine.lo) : `${trimNum(volumeLine.lo)} - ${trimNum(volumeLine.hi)}`} {t('مل')}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold truncate">{t(form.labelAr)}</p>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-gray-500 font-bold mt-2 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 shrink-0" />
                    {t('كل {0} ساعات • {1} مرات في اليوم', [med.intervalH, med.perDay])}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                  {t('الحد الأقصى يومياً')}
                </span>
                <span className="text-sm font-black text-gray-900">{maxDaily}</span>
              </div>
              {showCap && capSingleMg !== null && (
                <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    {t('حد العمر ({0} سنة)', [Math.round(years ?? 0)])}
                  </span>
                  <span className="text-sm font-black text-gray-900">{fmtNum(capSingleMg)} {t('مجم')}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-xs font-bold text-amber-800 leading-relaxed">
                {t('أدخل وزن الطفل بالكيلوجرام لحساب الجرعة التقريبية. الجرعات تحسب عادة على أساس الوزن وليس العمر.')}
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <p className="text-[11px] font-bold text-red-700 leading-relaxed">
              {t('هذه الحاسبة لأغراض إرشادية فقط ولا تغني عن استشارة الطبيب أو الصيدلي. لا تعطِ أي دواء لطفل بدون وصفة طبية عند الحاجة، واحفظ الأدوية بعيداً عن متناول الأطفال.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
