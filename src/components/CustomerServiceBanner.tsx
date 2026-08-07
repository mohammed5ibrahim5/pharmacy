import { PhoneCall, MessageCircle, Mail, ShieldCheck, Clock } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';

export function CustomerServiceBanner() {
  const { settings, themeColors } = useSettings();
  const { t } = useLanguage();
  const hasContact = settings.contact_phone || settings.contact_whatsapp || settings.contact_email;
  if (!hasContact) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="rounded-[2rem] relative overflow-hidden bg-slate-900 text-white">
        {/* Decorative pattern + glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: `${themeColors.primaryColor}22` }} />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 px-6 sm:px-10 py-10">
          <div className="flex items-start gap-4 max-w-xl">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-lg">
              <PhoneCall className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-black mb-2">
                <ShieldCheck className="w-3 h-3" />
                {t('خدمة العملاء')}
              </div>
              <h2 className="text-xl sm:text-2xl font-black leading-snug">{t('عندك مشكلة في طلبك؟')}</h2>
              <p className="text-xs sm:text-sm text-white/75 font-bold leading-relaxed mt-1.5">
                {t('فريقنا جاهز لمساعدتك في أي استفسار أو مشكلة — اتصل بنا أو راسلنا واتساب وسنرد عليك بأسرع وقت.')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {settings.contact_phone && (
              <a
                href={`tel:${settings.contact_phone}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-900 font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <PhoneCall className="w-4 h-4" />
                <span dir="ltr">{settings.contact_phone}</span>
              </a>
            )}
            {settings.contact_whatsapp && (
              <a
                href={`https://wa.me/${settings.contact_whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
                style={{ backgroundColor: '#25d366', color: '#fff' }}
              >
                <MessageCircle className="w-4 h-4" />
                {t('واتساب مباشر')}
              </a>
            )}
            {settings.contact_email && (
              <a
                href={`mailto:${settings.contact_email}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg border border-white/30 bg-white/10 backdrop-blur-sm"
              >
                <Mail className="w-4 h-4" />
                {t('البريد الإلكتروني')}
              </a>
            )}
          </div>

          <div className="hidden lg:flex flex-col items-center gap-1.5 text-white/60 shrink-0">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-black">{t('متاحون للرد')}</span>
            <span className="text-[10px] font-bold">{t('على مدار اليوم')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
