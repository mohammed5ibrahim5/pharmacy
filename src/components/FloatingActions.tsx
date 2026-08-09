import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';

export function FloatingActions() {
  const { themeColors } = useSettings();
  const { t } = useLanguage();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed bottom-24 lg:bottom-5 start-5 z-50 flex flex-col items-center gap-3">
      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-11 h-11 rounded-2xl bg-white border border-gray-200 shadow-lg flex items-center justify-center text-slate-600 hover:text-white transition-all hover:scale-110 active:scale-95 animate-fade-up"
          style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
          title={t('العودة للأعلى')}
          aria-label={t('العودة للأعلى')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = themeColors.primaryColor;
            e.currentTarget.style.borderColor = themeColors.primaryColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.borderColor = '';
          }}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
