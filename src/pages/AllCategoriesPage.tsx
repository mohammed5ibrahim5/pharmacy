import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, LayoutGrid, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useLanguage } from '@/context/LanguageContext';
import { categoryColor, categoryGradient, categoryIcon, mergeCategories, orderedCategories } from '@/lib/categoryStyles';
import type { Category } from '@/types';

export function AllCategoriesPage() {
  const { t, lang, dir } = useLanguage();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [catRes, countRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('products').select('category_id').eq('is_available', true),
      ]);
      setCategories(catRes.data || []);
      const counts: Record<string, number> = {};
      (countRes.data || []).forEach((r: { category_id: string | null }) => {
        if (r.category_id) counts[r.category_id] = (counts[r.category_id] || 0) + 1;
      });
      setCategoryCounts(counts);
      setLoading(false);
    };
    fetch();
  }, []);

  const allCategories = useMemo(() => orderedCategories(mergeCategories(categories)), [categories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate({ name: 'home' })}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {t('العودة للرئيسية')}
      </button>

      {/* Header hero */}
      <div
        className="relative rounded-3xl p-8 mb-8 overflow-hidden border shadow-2xs"
        style={{
          background: `linear-gradient(135deg, ${themeColors.pharmacyHeaderBg}, ${themeColors.sectionBg})`,
          borderColor: `${themeColors.priceColor}20`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(transparent_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-10" />
        <div className="absolute -top-16 -start-16 w-48 h-48 rounded-full opacity-[0.1] blur-3xl" style={{ backgroundColor: themeColors.priceColor }} />
        <div className="relative flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border"
            style={{ backgroundColor: themeColors.cardBg, borderColor: `${themeColors.priceColor}20` }}
          >
            <LayoutGrid className="w-8 h-8" style={{ color: themeColors.priceColor }} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black" style={{ color: themeColors.sectionHeadingText }}>{t('جميع الأقسام')}</h1>
            <p className="mt-1 text-xs font-bold" style={{ color: themeColors.sectionSubheadingText }}>
              {t('تصفح جميع الأقسام الطبية في مكان واحد واختر ما يناسبك')}
            </p>
          </div>
          <button
            onClick={() => navigate({ name: 'search', query: '' })}
            className="ms-auto hidden sm:flex w-11 h-11 rounded-full border items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:scale-90"
            style={{
              backgroundColor: themeColors.cardBg,
              color: themeColors.headerText,
              borderColor: `${themeColors.headerText}14`,
            }}
            title={t('ابحث عن دواء')}
            aria-label={t('ابحث عن دواء')}
          >
            <Search className="w-[19px] h-[19px]" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="skeleton rounded-2xl h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {allCategories.map((cat) => {
            const color = categoryColor(cat.slug);
            const gradient = categoryGradient(cat.slug);
            const Icon = categoryIcon(cat.slug, cat.icon);
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                onClick={() => navigate({ name: 'category', slug: cat.slug })}
                className="group relative flex flex-col justify-between p-4 rounded-2xl text-white text-center overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl active:scale-95 min-h-[9.5rem]"
                style={{
                  background: gradient,
                  boxShadow: `0 12px 26px -16px ${color}dd`,
                }}
              >
                <span className="absolute -end-6 -top-6 w-20 h-20 rounded-full bg-white/15 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-white/0 via-white/60 to-white/0 opacity-60 pointer-events-none" />

                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 backdrop-blur-sm flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-all duration-300 group-hover:bg-white group-hover:-translate-x-0.5 shrink-0">
                    {dir === 'ltr' ? <ChevronRight className="w-3.5 h-3.5 group-hover:text-slate-900" /> : <ChevronLeft className="w-3.5 h-3.5 group-hover:text-slate-900" />}
                  </span>
                </div>

                <div className="mt-3 w-full">
                  <h3 className="text-sm font-black leading-tight line-clamp-1 drop-shadow-sm">
                    {lang === 'en' ? (cat.name_en || t(cat.name)) : cat.name}
                  </h3>
                  <span className="mt-1.5 inline-block text-[10px] font-bold text-white/85">
                    {count > 0 ? t('{0} منتج', [count]) : t('متوفر الآن')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
