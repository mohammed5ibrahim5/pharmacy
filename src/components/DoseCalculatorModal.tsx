import { useState } from 'react';
import { X, Baby, Scale, Calculator, ShieldAlert, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';

interface MedDose {
  key: string;
  nameAr: string;
  nameEn: string;
  low: number;
  high: number;
  perDay: number;
  note?: string;
}

const MEDICINES: MedDose[] = [
  { key: 'paracetamol', nameAr: 'باراسيتامول', nameEn: 'Paracetamol', low: 10, high: 15, perDay: 4, note: 'كل 4-6 ساعات' },
  { key: 'ibuprofen', nameAr: 'إيبوبروفين', nameEn: 'Ibuprofen', low: 5, high: 10, perDay: 3, note: 'كل 6-8 ساعات بعد الأكل' },
  { key: 'amoxicillin', nameAr: 'أموكسيسيلين', nameEn: 'Amoxicillin', low: 20, high: 40, perDay: 3, note: 'بوصفة طبية فقط' },
  { key: 'azithromycin', nameAr: 'أزيثروميسين', nameEn: 'Azithromycin', low: 10, high: 10, perDay: 1, note: 'جرعة واحدة يومياً لمدة 3 أيام' },
  { key: 'cetirizine', nameAr: 'سيتريزين (مضاد حساسية)', nameEn: 'Cetirizine', low: 0.25, high: 0.25, perDay: 1, note: 'جرعة واحدة يومياً' },
];

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

export function DoseCalculatorModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { themeColors } = useSettings();
  const [medKey, setMedKey] = useState('paracetamol');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');

  const med = MEDICINES.find((m) => m.key === medKey) || MEDICINES[0];
  const w = parseFloat(weight);
  const hasWeight = !Number.isNaN(w) && w > 0;

  const singleDose = hasWeight ? (w * med.low).toFixed(0) + ' - ' + (w * med.high).toFixed(0) + ' مجم' : null;
  const maxDaily = hasWeight ? (w * med.high * med.perDay).toFixed(0) + ' مجم' : null;

  const hint = hasWeight
    ? (WEIGHT_HINTS.find((h) => w >= h.min && w < h.max)?.hint || '')
    : '';

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
              <p className="text-[11px] text-gray-500 font-bold">{t('إرشادات تقريبية فقط')}</p>
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
              onChange={(e) => setMedKey(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
            >
              {MEDICINES.map((m) => (
                <option key={m.key} value={m.key}>{t(m.nameAr)}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 font-bold mt-1">{med.nameEn} {med.note ? ` • ${t(med.note)}` : ''}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('الوزن (كجم) *')}</label>
              <div className="relative">
                <Scale className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="مثال: 12"
                  dir="ltr"
                  className="w-full ps-4 pe-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('العمر (اختياري)')}</label>
              <input
                type="number"
                min="0"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('بالسنوات')}
                dir="ltr"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2"
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

          {hasWeight ? (
            <div className="rounded-2xl p-4 space-y-3 animate-fade-in" style={{ backgroundColor: `${themeColors.primaryColor}10` }}>
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: themeColors.primaryColor }} />
                <div>
                  <p className="text-xs font-black text-gray-900">{t('الجرعة الواحدة لـ {0}', [t(med.nameAr)])}</p>
                  <p className="text-lg font-black" style={{ color: themeColors.primaryColor }}>{singleDose}</p>
                  <p className="text-[11px] text-gray-500 font-bold">{t('بمعدل {0} مرات يومياً كحد أقصى', [med.perDay])}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                  {t('الحد الأقصى يومياً')}
                </span>
                <span className="text-sm font-black text-gray-900">{maxDaily}</span>
              </div>
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
