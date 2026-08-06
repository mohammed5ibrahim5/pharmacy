import { FlaskConical, Snowflake, Pill, CalendarCheck } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const TIPS = [
  {
    icon: <FlaskConical className="w-6 h-6" />,
    color: '#0d9488',
    title: 'التزم بالجرعات',
    desc: 'لا توقف الدواء أو تغيّر الجرعة دون استشارة الطبيب أو الصيدلي، حتى لو شعرت بتحسن.',
  },
  {
    icon: <Snowflake className="w-6 h-6" />,
    color: '#2563eb',
    title: 'حفظ الأدوية الصحيح',
    desc: 'احفظ الأدوية في مكان جاف بارد بعيداً عن الشمس والرطوبة وبعيداً عن متناول الأطفال.',
  },
  {
    icon: <Pill className="w-6 h-6" />,
    color: '#d97706',
    title: 'التفاعلات الدوائية',
    desc: 'أخبر الصيدلي عن كل الأدوية والمكملات التي تتناولها لتجنب أي تداخل دوائي خطير.',
  },
  {
    icon: <CalendarCheck className="w-6 h-6" />,
    color: '#7c3aed',
    title: 'متابعة دورية',
    desc: 'افحص ضغطك وسكرك بانتظام، وتابع فحص النظر سنوياً خاصة مع السكري أو الضغط المرتفع.',
  },
];

export function HomeHealthTips() {
  const { themeColors } = useSettings();

  return (
    <section className="py-12 border-y border-gray-100" style={{ backgroundColor: themeColors.sectionAltBg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span
            className="text-xs font-extrabold px-3.5 py-1 rounded-full"
            style={{ backgroundColor: `${themeColors.badgePillBg}15`, color: themeColors.badgePillText }}
          >
            من قلب الصيدلية
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2" style={{ color: themeColors.sectionHeadingText }}>نصائح صحية من الصيدلي</h2>
          <p className="text-sm mt-2 font-bold" style={{ color: themeColors.sectionSubheadingText }}>إرشادات بسيطة تحمي صحتك وصحة عائلتك</p>
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
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${tip.color}15`, color: tip.color }}
              >
                {tip.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: tip.color }}>
                نصيحة الصيدلي
              </span>
              <h3 className="font-extrabold text-base mt-1 mb-2" style={{ color: themeColors.cardText }}>{tip.title}</h3>
              <p className="text-xs leading-relaxed font-medium" style={{ color: themeColors.cardMutedText }}>{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
