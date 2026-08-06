import { BadgeCheck, ShieldCheck, Lock, Award, Building2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const PARTNERS = [
  'التأمين الصحي',
  'التأمين الصحي الشامل',
  'مصر للتأمين',
  'أليانز مصر',
  'GIG للتأمين',
  'ميدغلف',
  'المصرية للرعاية الصحية',
  'أورنج للتأمين',
];

const TRUST_BADGES = [
  { icon: <ShieldCheck className="w-4 h-4" />, label: 'صيدليات مرخصة ومعتمدة' },
  { icon: <BadgeCheck className="w-4 h-4" />, label: 'أسعار محدثة يومياً' },
  { icon: <Lock className="w-4 h-4" />, label: 'دفع آمن ومشفّر' },
  { icon: <Award className="w-4 h-4" />, label: 'جودة وتغليف محكم' },
];

export function HomeTrustBar() {
  const { themeColors } = useSettings();

  return (
    <section className="py-8 border-y border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust badges row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {TRUST_BADGES.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-50 border border-gray-100"
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${themeColors.primaryColor}12`, color: themeColors.primaryColor }}
              >
                {badge.icon}
              </span>
              <span className="text-[11px] sm:text-xs font-extrabold text-slate-700">{badge.label}</span>
            </div>
          ))}
        </div>

        {/* Partners marquee */}
        <div className="flex items-center gap-4">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[11px] font-black shrink-0 border"
            style={{
              backgroundColor: `${themeColors.primaryColor}10`,
              color: themeColors.primaryColor,
              borderColor: `${themeColors.primaryColor}25`
            }}
          >
            <Building2 className="w-4 h-4" />
            شركاء التأمين والرعاية
          </span>
          <div className="relative flex-1 overflow-hidden" dir="ltr">
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10" />
            <div className="flex w-max animate-marquee gap-3">
              {[...PARTNERS, ...PARTNERS].map((name, i) => (
                <span
                  key={i}
                  className="shrink-0 px-5 py-2.5 rounded-2xl border border-gray-100 bg-slate-50/60 text-xs font-extrabold text-slate-500"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
