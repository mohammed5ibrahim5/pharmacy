import { useState, useEffect } from 'react';
import { MessageCircle, ArrowUp } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';

export function FloatingActions() {
  const { settings, themeColors } = useSettings();
  const { t } = useLanguage();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const whatsappDigits = settings.contact_whatsapp ? settings.contact_whatsapp.replace(/\D/g, '') : null;

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

      {whatsappDigits && (
        <a
          href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(t('مرحباً، أحتاج مساعدة في الطلب من صيدليتي'))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-14 h-14 rounded-2xl text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          style={{ backgroundColor: themeColors.whatsappBtnBg }}
          title={t('تواصل معنا واتساب')}
          aria-label={t('تواصل معنا واتساب')}
        >
          <span className="absolute inset-0 rounded-2xl opacity-60 animate-ping" style={{ backgroundColor: themeColors.whatsappBtnBg }} />
          <MessageCircle className="w-7 h-7 relative" />
        </a>
      )}
    </div>
  );
}
