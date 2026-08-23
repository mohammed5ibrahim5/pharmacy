import { useState, useEffect } from 'react';
import { ArrowUp, Send } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCompare } from '@/context/CompareContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';

export function FloatingActions() {
  const { themeColors, settings } = useSettings();
  const { t } = useLanguage();
  const { compareList, barHidden } = useCompare();
  const [showTop, setShowTop] = useState(false);
  const compareBarVisible = compareList.length > 0 && !barHidden;

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`fixed start-5 z-50 flex flex-col items-center gap-3 transition-all duration-300 ${compareBarVisible ? 'bottom-56' : 'bottom-24'} lg:bottom-5`}>
      {settings.contact_whatsapp && (
        <a
          href={buildWhatsAppLink(settings.contact_whatsapp, t('مرحباً، أحتاج مساعدة من صيدليتي'))}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex w-11 h-11 rounded-2xl items-center justify-center text-white shadow-lg transition-all hover:scale-110 active:scale-95 animate-fade-up"
          style={{
            backgroundColor: themeColors.whatsappBtnBg || '#25D366',
            boxShadow: `0 10px 22px -8px ${themeColors.whatsappBtnBg || '#25D366'}aa`,
          }}
          title={t('تواصل معنا واتساب')}
          aria-label={t('تواصل معنا واتساب')}
        >
          <Send className="w-5 h-5" strokeWidth={2.25} />
        </a>
      )}
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
