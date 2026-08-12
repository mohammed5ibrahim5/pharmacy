import { useRef } from 'react';
import {
  Heart,
  Baby,
  Activity,
  Droplet,
  Brain,
  Bone,
  Eye,
  Thermometer,
  Pill,
  Shield,
  Sparkles,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useLanguage } from '@/context/LanguageContext';

interface HealthCategory {
  slug: string;
  name: string;
  icon: React.ReactNode;
  gradient: string;
  bgGradient: string;
  emoji: string;
}

const HEALTH_CATEGORIES: HealthCategory[] = [
  {
    slug: 'painkillers',
    name: 'مسكنات الألم',
    icon: <Pill className="w-6 h-6" />,
    gradient: 'from-teal-500 to-emerald-500',
    bgGradient: 'linear-gradient(135deg, #0d9488, #059669)',
    emoji: '💊',
  },
  {
    slug: 'antibiotics',
    name: 'مضادات حيوية',
    icon: <Shield className="w-6 h-6" />,
    gradient: 'from-blue-500 to-indigo-500',
    bgGradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    emoji: '🛡️',
  },
  {
    slug: 'vitamins',
    name: 'فيتامينات',
    icon: <Sparkles className="w-6 h-6" />,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
    emoji: '✨',
  },
  {
    slug: 'cold-flu',
    name: 'برد وإنفلونزا',
    icon: <Thermometer className="w-6 h-6" />,
    gradient: 'from-red-500 to-rose-500',
    bgGradient: 'linear-gradient(135deg, #ef4444, #f43f5e)',
    emoji: '🤒',
  },
  {
    slug: 'skin-care',
    name: 'العناية بالبشرة',
    icon: <Droplet className="w-6 h-6" />,
    gradient: 'from-pink-500 to-fuchsia-500',
    bgGradient: 'linear-gradient(135deg, #ec4899, #d946ef)',
    emoji: '✨',
  },
  {
    slug: 'baby-care',
    name: 'مستلزمات الأطفال',
    icon: <Baby className="w-6 h-6" />,
    gradient: 'from-sky-500 to-cyan-500',
    bgGradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
    emoji: '👶',
  },
  {
    slug: 'digestive',
    name: 'الجهاز الهضمي',
    icon: <Activity className="w-6 h-6" />,
    gradient: 'from-green-500 to-teal-500',
    bgGradient: 'linear-gradient(135deg, #22c55e, #14b8a6)',
    emoji: '🌿',
  },
  {
    slug: 'supplements',
    name: 'مكملات غذائية',
    icon: <Heart className="w-6 h-6" />,
    gradient: 'from-purple-500 to-violet-500',
    bgGradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    emoji: '💪',
  },
  {
    slug: 'mental-health',
    name: 'الصحة النفسية',
    icon: <Brain className="w-6 h-6" />,
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    emoji: '🧠',
  },
  {
    slug: 'orthopedic',
    name: 'العظام والمفاصل',
    icon: <Bone className="w-6 h-6" />,
    gradient: 'from-slate-500 to-gray-600',
    bgGradient: 'linear-gradient(135deg, #64748b, #475569)',
    emoji: '🦴',
  },
  {
    slug: 'ophthalmology',
    name: 'طب العيون',
    icon: <Eye className="w-6 h-6" />,
    gradient: 'from-cyan-500 to-sky-500',
    bgGradient: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
    emoji: '👁️',
  },
  {
    slug: 'general',
    name: 'طب عام',
    icon: <Stethoscope className="w-6 h-6" />,
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'linear-gradient(135deg, #10b981, #0d9488)',
    emoji: '🩺',
  },
];

export function HealthCategoriesBanner() {
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 280;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="py-8 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(13,148,136,1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(15,118,110,1) 0%, transparent 50%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold mb-1.5"
              style={{ backgroundColor: `${themeColors.primaryColor}15`, color: themeColors.primaryColor }}
            >
              <Stethoscope className="w-3 h-3" />
              {t('تصفّح حسب الحاجة')}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('الأقسام الطبية')}
            </h2>
          </div>

          {/* Scroll controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-white transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-white transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-none pb-2"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {HEALTH_CATEGORIES.map((cat, i) => (
            <button
              key={cat.slug}
              onClick={() => navigate({ name: 'category', slug: cat.slug })}
              className="group shrink-0 flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-slate-200/80 bg-white hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 w-[110px] text-center animate-fade-up"
              style={{
                scrollSnapAlign: 'start',
                animationDelay: `${i * 0.05}s`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget.style.borderColor) = 'transparent';
                (e.currentTarget.style.background) = cat.bgGradient;
                const icon = e.currentTarget.querySelector('.cat-icon') as HTMLElement;
                const text = e.currentTarget.querySelector('.cat-text') as HTMLElement;
                if (icon) { icon.style.backgroundColor = 'rgba(255,255,255,0.2)'; icon.style.color = 'white'; }
                if (text) text.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.background = '';
                const icon = e.currentTarget.querySelector('.cat-icon') as HTMLElement;
                const text = e.currentTarget.querySelector('.cat-text') as HTMLElement;
                if (icon) { icon.style.backgroundColor = ''; icon.style.color = ''; }
                if (text) text.style.color = '';
              }}
            >
              {/* Icon */}
              <div
                className="cat-icon w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                style={{
                  background: `${cat.bgGradient.replace('linear-gradient(135deg, ', '').split(',')[0].trim()}22`,
                  color: cat.bgGradient.replace('linear-gradient(135deg, ', '').split(',')[0].trim(),
                }}
              >
                {cat.icon}
              </div>

              {/* Name */}
              <span className="cat-text text-[11px] font-extrabold text-slate-800 leading-tight transition-colors duration-300">
                {t(cat.name)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
