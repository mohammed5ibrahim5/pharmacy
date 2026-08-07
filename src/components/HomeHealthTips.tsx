import { FlaskConical, Snowflake, Pill, CalendarCheck, HeartPulse, Sparkles } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';

const TIPS = [
  {
    icon: <FlaskConical className="w-8 h-8" />,
    color: '#0d9488',
    title: 'التزم بالجرعات',
    desc: 'لا توقف الدواء أو تغيّر الجرعة دون استشارة الطبيب أو الصيدلي، حتى لو شعرت بتحسن.',
  },
  {
    icon: <Snowflake className="w-8 h-8" />,
    color: '#2563eb',
    title: 'حفظ الأدوية الصحيح',
    desc: 'احفظ الأدوية في مكان جاف بارد بعيداً عن الشمس والرطوبة وبعيداً عن متناول الأطفال.',
  },
  {
    icon: <Pill className="w-8 h-8" />,
    color: '#d97706',
    title: 'التفاعلات الدوائية',
    desc: 'أخبر الصيدلي عن كل الأدوية والمكملات التي تتناولها لتجنب أي تداخل دوائي خطير.',
  },
  {
    icon: <CalendarCheck className="w-8 h-8" />,
    color: '#7c3aed',
    title: 'متابعة دورية',
    desc: 'افحص ضغطك وسكرك بانتظام، وتابع فحص النظر سنوياً خاصة مع السكري أو الضغط المرتفع.',
  },
];

export function HomeHealthTips() {
  const { themeColors } = useSettings();
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden py-12 border-y border-gray-100" style={{ backgroundColor: themeColors.sectionAltBg }}>
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none bg-dots" />
      <div
        className="absolute -top-20 -end-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: `${themeColors.primaryColor}0d` }}
      />
      <div
        className="absolute -bottom-24 -start-24 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: `${themeColors.accentColor}0a` }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-40 rounded-full blur-3xl pointer-events-none opacity-40"
        style={{ backgroundColor: `${themeColors.secondaryColor}08` }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span
            className="text-xs font-extrabold px-3.5 py-1 rounded-full inline-flex items-center gap-1.5"
            style={{ backgroundColor: `${themeColors.badgePillBg}15`, color: themeColors.badgePillText }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('من قلب الصيدلية')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 flex items-center justify-center gap-2.5" style={{ color: themeColors.sectionHeadingText }}>
            <span
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${themeColors.primaryColor}12`, color: themeColors.primaryColor }}
            >
              <HeartPulse className="w-5 h-5" />
            </span>
            {t('نصائح صحية من الصيدلي')}
          </h2>
          <p className="text-sm mt-2 font-bold" style={{ color: themeColors.sectionSubheadingText }}>{t('إرشادات بسيطة تحمي صحتك وصحة عائلتك')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIPS.map((tip, i) => (
            <div
              key={i}
              className="group relative rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
              style={{ backgroundColor: themeColors.cardBg }}
            >
              <div
                className="absolute top-0 right-0 left-0 h-1 opacity-70 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(to left, ${tip.color}, ${themeColors.primaryColor})` }}
              />
              <div
                className="absolute -top-6 -start-6 w-24 h-24 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none"
                style={{ backgroundColor: `${tip.color}15` }}
              />
              <div
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${tip.color}15`, color: tip.color }}
              >
                {tip.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: tip.color }}>
                {t('نصيحة الصيدلي')}
              </span>
              <h3 className="font-extrabold text-base mt-1 mb-2" style={{ color: themeColors.cardText }}>{t(tip.title)}</h3>
              <p className="text-xs leading-relaxed font-medium" style={{ color: themeColors.cardMutedText }}>{t(tip.desc)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
