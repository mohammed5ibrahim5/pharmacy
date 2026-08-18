import { useState, useEffect } from 'react';
import { Scale, X, ArrowRight, Store, Trash2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCompare } from '@/context/CompareContext';

export function CompareBar() {
  const { themeColors } = useSettings();
  const { t, lang } = useLanguage();
  const { compareList, removeFromCompare, clearCompare, openCompare, barHidden, hideCompareBar } = useCompare();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (compareList.length === 0) setVisible(true);
  }, [compareList.length]);

  if (compareList.length === 0 || barHidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 sm:px-4 pb-3 sm:pb-4 pointer-events-none">
      <div
        className={`pointer-events-auto max-w-3xl mx-auto rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
        style={{
          backgroundColor: themeColors.headerBg,
          borderColor: `${themeColors.priceColor}35`,
          boxShadow: `0 20px 50px -12px ${themeColors.priceColor}66`,
        }}
      >
        {/* Tray header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ borderColor: `${themeColors.priceColor}20` }}
        >
          <div className="flex items-center gap-2 text-xs font-black" style={{ color: themeColors.priceColor }}>
            <Scale className="w-4 h-4" />
            {t('مقارنة الصيدليات')}
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
              style={{ backgroundColor: `${themeColors.priceColor}18`, color: themeColors.priceColor }}
            >
              {compareList.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setVisible(false); hideCompareBar(); }}
              className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3 h-3" />
              {t('إخفاء')}
            </button>
          </div>
        </div>

        {/* Pharmacies chips */}
        <div className="px-3 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {compareList.map((pharmacy) => (
            <div
              key={pharmacy.id}
              className="flex items-center gap-1.5 shrink-0 pl-1.5 rounded-full border bg-white shadow-sm"
              style={{ borderColor: `${themeColors.priceColor}25` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-white font-black text-xs shrink-0"
                style={{ backgroundColor: themeColors.primaryColor }}
              >
                {pharmacy.logo_url ? (
                  <img src={pharmacy.logo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <span>{(lang === 'en' ? pharmacy.name_en || pharmacy.name : pharmacy.name).charAt(0)}</span>
                )}
              </div>
              <span className="text-[11px] font-extrabold max-w-[90px] truncate" style={{ color: themeColors.cardText }}>
                {lang === 'en' ? (pharmacy.name_en || pharmacy.name) : pharmacy.name}
              </span>
              <button
                type="button"
                onClick={() => removeFromCompare(pharmacy.id)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title={t('إزالة')}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={clearCompare}
            className="flex items-center gap-1 shrink-0 px-2 py-1.5 rounded-full text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors"
            title={t('مسح الكل')}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('مسح الكل')}
          </button>
        </div>

        {/* Compare action */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={openCompare}
            disabled={compareList.length < 2}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-black text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: themeColors.priceColor,
              boxShadow: `0 10px 22px -8px ${themeColors.priceColor}88`,
            }}
          >
            <Store className="w-4 h-4" />
            {t('قارن الآن')}
            <ArrowRight className={`w-4 h-4 ${lang === 'en' ? 'rotate-180' : ''}`} />
          </button>
          {compareList.length < 2 && (
            <p className="text-center text-[10px] font-bold text-gray-400 mt-1.5">
              {t('أضف صيدلية أخرى على الأقل لإتمام المقارنة')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
