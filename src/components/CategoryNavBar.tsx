import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pill,
  Shield,
  Sparkles,
  Stethoscope,
  HeartPulse,
  Droplet,
  Baby,
  Activity,
  Heart,
  Brain,
  Bone,
  Eye,
  Thermometer,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  pill: Pill,
  shield: Shield,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  heartpulse: HeartPulse,
  droplet: Droplet,
  baby: Baby,
  activity: Activity,
  heart: Heart,
  brain: Brain,
  bone: Bone,
  eye: Eye,
  thermometer: Thermometer,
};

const COLOR_MAP: Record<string, string> = {
  painkillers: '#0d9488',
  antibiotics: '#2563eb',
  supplements: '#d97706',
  'cold-flu': '#dc2626',
  vitamins: '#7c3aed',
  'skin-care': '#db2777',
  'baby-care': '#e11d48',
  digestive: '#16a34a',
  'mental-health': '#8b5cf6',
  orthopedic: '#64748b',
  ophthalmology: '#06b6d4',
  general: '#10b981',
};

const FALLBACK_COLORS = [
  '#0d9488', '#2563eb', '#d97706', '#dc2626', '#7c3aed',
  '#db2777', '#16a34a', '#0891b2', '#4f46e5', '#ea580c',
];

function colorForSlug(slug: string): string {
  const known = COLOR_MAP[slug];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export function CategoryNavBar() {
  const { themeColors } = useSettings();
  const { navigate, route } = useRouter();
  const { t, lang, dir } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [canEnd, setCanEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error || !data || data.length === 0) {
        const fallback = await supabase.from('categories').select('*').order('name', { ascending: true });
        if (!cancelled && fallback.data && fallback.data.length > 0) {
          setCategories(fallback.data as Category[]);
        }
      } else if (!cancelled) {
        setCategories(data as Category[]);
      }
      if (!cancelled) setLoading(false);
    };
    fetchCategories();
    return () => { cancelled = true; };
  }, []);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setHasOverflow(max > 4);
    const current = Math.abs(el.scrollLeft);
    setCanStart(current > 4);
    setCanEnd(current < max - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows, categories.length]);

  const scrollTo = useCallback(
    (direction: 'start' | 'end') => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      const current = Math.abs(el.scrollLeft);
      const amount = Math.min(320, Math.max(120, el.clientWidth * 0.8));
      const target = direction === 'end' ? Math.min(max, current + amount) : Math.max(0, current - amount);
      el.scrollTo({ left: (dir === 'rtl' ? -1 : 1) * target, behavior: 'smooth' });
    },
    [dir],
  );

  const isActive = (slug: string) => route.name === 'category' && route.slug === slug;
  const isRtl = dir === 'rtl';
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight;
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;

  const maskStyle = hasOverflow
    ? {
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, black 36px, black calc(100% - 36px), transparent 100%)',
        maskImage:
          'linear-gradient(to right, transparent 0, black 36px, black calc(100% - 36px), transparent 100%)',
      }
    : undefined;

  return (
    <div
      className="sticky top-0 z-40 border-b shadow-sm"
      style={{
        backgroundColor: themeColors.headerNavBg,
        color: themeColors.headerNavText,
        borderColor: `${themeColors.headerNavText}15`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* Label */}
          <div
            className="hidden sm:flex items-center gap-2 shrink-0 pe-4 border-e"
            style={{ borderColor: `${themeColors.headerNavText}20` }}
          >
            <LayoutGrid className="w-4 h-4" style={{ color: themeColors.accentColor }} />
            <span className="text-xs font-black whitespace-nowrap">{t('تصفح حسب الفئة')}</span>
          </div>

          {/* Scrollable pills */}
          <div className="relative flex-1 min-w-0">
            <div
              ref={scrollRef}
              onScroll={updateArrows}
              className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2.5 md:px-10"
              style={{ scrollSnapType: 'x mandatory', ...maskStyle }}
            >
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 h-9 w-28 rounded-xl bg-white/10 animate-pulse"
                    style={{ scrollSnapAlign: 'start' }}
                  />
                ))
              ) : (
                categories.map((cat) => {
                  const Icon = (cat.icon && ICON_MAP[cat.icon]) || Pill;
                  const color = colorForSlug(cat.slug);
                  const active = isActive(cat.slug);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => navigate({ name: 'category', slug: cat.slug })}
                      className="group flex items-center gap-2 shrink-0 rounded-xl border px-2.5 py-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                      style={{
                        backgroundColor: active ? color : 'rgba(255,255,255,0.08)',
                        borderColor: active ? color : 'rgba(255,255,255,0.18)',
                        boxShadow: active ? `0 4px 14px ${color}55` : 'none',
                        scrollSnapAlign: 'start',
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                        style={{
                          backgroundColor: active ? 'rgba(255,255,255,0.22)' : `${color}33`,
                          color: active ? '#ffffff' : color,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span
                        className="text-xs font-extrabold whitespace-nowrap transition-colors"
                        style={{ color: active ? '#ffffff' : themeColors.headerNavText }}
                      >
                        {lang === 'en' ? (cat.name_en || t(cat.name)) : cat.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Arrows */}
            {hasOverflow && !loading && (
              <>
                <button
                  type="button"
                  onClick={() => scrollTo('start')}
                  disabled={!canStart}
                  aria-label={t('السابق')}
                  className="absolute top-1/2 -translate-y-1/2 start-0 hidden md:flex items-center justify-center w-8 h-8 rounded-xl backdrop-blur border transition-all disabled:opacity-0"
                  style={{
                    backgroundColor: themeColors.headerNavBg,
                    borderColor: `${themeColors.headerNavText}25`,
                    color: themeColors.headerNavText,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <BackIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('end')}
                  disabled={!canEnd}
                  aria-label={t('التالي')}
                  className="absolute top-1/2 -translate-y-1/2 end-0 hidden md:flex items-center justify-center w-8 h-8 rounded-xl backdrop-blur border transition-all disabled:opacity-0"
                  style={{
                    backgroundColor: themeColors.headerNavBg,
                    borderColor: `${themeColors.headerNavText}25`,
                    color: themeColors.headerNavText,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <ForwardIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
