import { Search, Store, ShoppingBag, Home } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';

const STEP_ICONS = [<Search className="w-6 h-6" />, <Store className="w-6 h-6" />, <ShoppingBag className="w-6 h-6" />, <Home className="w-6 h-6" />];

export function HomeHowItWorks() {
  const { themeColors, howItWorksConfig } = useSettings();
  const { t } = useLanguage();

  if (!howItWorksConfig.enabled) return null;

  const steps = howItWorksConfig.steps.length > 0 ? howItWorksConfig.steps : Array.from({ length: 4 }, (_, i) => ({ title: t('خطوة {0}', [i + 1]), desc: '' }));

  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span
            className="text-xs font-extrabold px-3.5 py-1 rounded-full"
            style={{ backgroundColor: `${themeColors.primaryColor}15`, color: themeColors.primaryColor }}
          >
            {t(howItWorksConfig.badge)}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{t(howItWorksConfig.title)}</h2>
          {howItWorksConfig.subtitle && <p className="text-sm text-slate-500 mt-2 font-bold">{t(howItWorksConfig.subtitle)}</p>}
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 right-[12%] left-[12%] h-0.5 rounded-full" style={{ background: `linear-gradient(to left, ${themeColors.primaryColor}30, ${themeColors.secondaryColor}30)` }} />

          {steps.map((step, i) => (
            <div key={i} className="relative text-center group">
              <div className="relative z-10 mx-auto mb-4">
                <div className="relative">
                  <span
                    className="absolute inset-0 rounded-3xl animate-ping opacity-20"
                    style={{ backgroundColor: themeColors.secondaryColor, animationDuration: '3s' }}
                  />
                  <div
                    className="relative w-20 h-20 rounded-3xl flex items-center justify-center border-2 border-white shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 animate-icon-bob"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})`,
                      color: '#fff',
                      boxShadow: `0 16px 30px -10px ${themeColors.primaryColor}66`,
                    }}
                  >
                    {STEP_ICONS[i % STEP_ICONS.length]}
                  </div>
                </div>
                <span
                  className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 border-white shadow-md animate-pulse-soft"
                  style={{ backgroundColor: themeColors.accent2Color, color: '#fff' }}
                >
                  {i + 1}
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1.5">{t(step.title)}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium max-w-[240px] mx-auto">{t(step.desc)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
