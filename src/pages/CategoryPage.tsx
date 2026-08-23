import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Package, LayoutGrid, Search, Sparkles, Pill, HeartPulse, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { ProductCard } from '@/components/ProductCard';
import { OtcFilterToggle } from '@/components/OtcFilterToggle';
import {
  mergeCategories,
  orderedCategories,
  categoryColor,
  categoryGradient,
  categoryIcon,
} from '@/lib/categoryStyles';
import type { Product, Category } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  slug: string;
}

const ALL_SLUG = 'all';

export function CategoryPage({ slug }: Props) {
  const { t, lang, dir } = useLanguage();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [otcOnly, setOtcOnly] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);

  const isAll = slug === ALL_SLUG;

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .then(({ data }) => {
        if (data) setCategories(orderedCategories(mergeCategories(data as Category[])));
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProducts([]);
    setActiveCat(null);
    (async () => {
      let query = supabase
        .from('products')
        .select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)')
        .eq('is_available', true);

      if (isAll) {
        query = query.limit(48);
      } else {
        const { data: cat } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        if (cancelled) return;
        setActiveCat((cat as Category) ?? null);
        if (!cat) {
          setLoading(false);
          return;
        }
        query = query.eq('category_id', (cat as Category).id);
      }

      const { data: prods } = await query.order('name');
      if (cancelled) return;
      setProducts((prods || []) as Product[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  /* حافظ على الشيب المختار ظاهر في الشريط */
  useEffect(() => {
    if (!chipsRef.current || categories.length === 0) return;
    const el = chipsRef.current.querySelector(`[data-chip="${slug}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [slug, categories]);

  /* عجلة الماوس تتحرك الشريط أفقيًا بسلاسة */
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        const rtl = document.documentElement.dir === 'rtl' || el.dir === 'rtl';
        el.scrollLeft += rtl ? -e.deltaY : e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* سحب الشريط بالماوس (زي اللمس على الموبايل) */
  const dragState = useRef({ down: false, startX: 0, startScroll: 0, moved: false });

  const visibleProducts = otcOnly ? products.filter((p) => !p.requires_prescription) : products;

  const title = isAll
    ? t('كل المنتجات')
    : activeCat
      ? lang === 'en'
        ? activeCat.name_en || t(activeCat.name)
        : activeCat.name
      : t('الفئة');
  const HeroIcon = isAll ? LayoutGrid : categoryIcon(slug, activeCat?.icon);
  const heroGradient = isAll
    ? `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor || themeColors.primaryColor})`
    : categoryGradient(slug);

  const Chip = ({ cat }: { cat: Category | null }) => {
    const s = cat?.slug ?? ALL_SLUG;
    const active = slug === s;
    const Icon = cat ? categoryIcon(s, cat.icon) : LayoutGrid;
    const label = cat ? (lang === 'en' ? cat.name_en || t(cat.name) : t(cat.name)) : t('الكل');
    return (
      <button
        data-chip={s}
        onClick={() => navigate({ name: 'category', slug: s })}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black whitespace-nowrap shrink-0 border transition-all duration-200 ${
          active ? 'text-white shadow-lg scale-[1.04] cursor-default' : 'hover:-translate-y-0.5 active:scale-95'
        }`}
        style={
          active
            ? {
                background: cat
                  ? categoryGradient(s)
                  : `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor || themeColors.primaryColor})`,
                borderColor: 'transparent',
              }
            : {
                backgroundColor: `${categoryColor(s)}0d`,
                color: themeColors.cardText,
                borderColor: `${categoryColor(s)}1f`,
                opacity: 0.85,
              }
        }
      >
        <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
        {label}
      </button>
    );
  };

  return (
    <div className="pb-14">
      {/* ══ هيرو الفئة — هوية بلون الفئة نفسها ══ */}
      <div className="relative overflow-hidden" style={{ background: heroGradient }}>
        {/* طبقات العمق */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-white/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:22px_22px] opacity-50 pointer-events-none" />

        {/* هالات ضوئية */}
        <div className="absolute -top-24 -start-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `${themeColors.priceColor}55` }} />
        <div className="absolute top-1/3 -end-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 start-1/3 w-72 h-72 rounded-full bg-black/20 blur-3xl pointer-events-none" />

        {/* أيقونات طبية عائمة */}
        <Pill className="absolute top-8 end-[12%] w-16 h-16 sm:w-24 sm:h-24 text-white/10 -rotate-12 pointer-events-none animate-float" strokeWidth={1.5} />
        <HeartPulse className="absolute bottom-10 start-[8%] w-14 h-14 sm:w-20 sm:h-20 text-white/10 rotate-6 pointer-events-none animate-float" style={{ animationDelay: '1.2s', animationDuration: '7s' }} strokeWidth={1.5} />
        <Plus className="absolute top-1/2 end-[38%] w-10 h-10 sm:w-14 sm:h-14 text-white/10 rotate-12 pointer-events-none animate-float" style={{ animationDelay: '2s', animationDuration: '9s' }} strokeWidth={1.5} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 sm:pt-8 sm:pb-20">
          <button
            onClick={() => navigate({ name: 'home' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-white/85 hover:text-white border border-white/25 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 mb-4 group"
          >
            {dir === 'ltr' ? (
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.25} />
            ) : (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.25} />
            )}
            {t('العودة للرئيسية')}
          </button>

          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-3xl bg-white/25 blur-xl" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/15 border border-white/30 backdrop-blur-md flex items-center justify-center shadow-2xl">
                <HeroIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={2.25} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold tracking-wide text-white/70 mb-0.5">{t('تصفح الفئة')}</p>
              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight drop-shadow-sm truncate">
                {title}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/18 border border-white/25 backdrop-blur-sm text-[11px] font-extrabold text-white shadow-sm">
                  <Package className="w-3.5 h-3.5" strokeWidth={2.25} />
                  {loading ? t('جاري التحميل...') : t('{0} منتج متاح حالياً', [products.length])}
                </span>
                {!isAll && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/15 text-[10px] font-bold text-white/90">
                    <Sparkles className="w-3 h-3" />
                    {t('قسم')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* انحناء سفلي ناعم */}
        <svg className="absolute bottom-0 left-0 w-full h-5 sm:h-7 text-gray-50 dark:text-[#111827]" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor" d="M0,40 C360,8 1080,8 1440,40 L1440,40 L0,40 Z" />
        </svg>
      </div>

      {/* ══ شريط الفئات الثابت — الكل + كل الفئات، تنقل فوري بدون رجوع ══ */}
      <div className="sticky top-0 z-40 border-b shadow-md"
        style={{
          backgroundColor: `${themeColors.sectionBg}f5`,
          borderColor: `${themeColors.headerText}12`,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2">
          <div
            ref={chipsRef}
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0 flex-1 py-0.5 select-none touch-pan-x"
            onPointerDown={(e) => {
              dragState.current = {
                down: true,
                startX: e.clientX,
                startScroll: chipsRef.current?.scrollLeft ?? 0,
                moved: false,
              };
            }}
            onPointerMove={(e) => {
              const st = dragState.current;
              if (!st.down || !chipsRef.current) return;
              const dx = e.clientX - st.startX;
              if (Math.abs(dx) > 6) st.moved = true;
              chipsRef.current.scrollLeft = st.startScroll - dx;
            }}
            onPointerUp={() => {
              dragState.current.down = false;
              window.setTimeout(() => { dragState.current.moved = false; }, 0);
            }}
            onPointerLeave={() => { dragState.current.down = false; }}
            onClickCapture={(e) => {
              if (dragState.current.moved) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <Chip cat={null} />
            {categories.map((cat) => (
              <Chip key={cat.id} cat={cat} />
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:block w-px h-6" style={{ backgroundColor: `${themeColors.headerText}14` }} />
            <button
              onClick={() => navigate({ name: 'search', query: '' })}
              className="hidden sm:flex w-9 h-9 rounded-full border items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:scale-90"
              style={{
                backgroundColor: `${themeColors.headerText}08`,
                color: themeColors.headerText,
                borderColor: `${themeColors.headerText}14`,
              }}
              title={t('ابحث عن دواء')}
              aria-label={t('ابحث عن دواء')}
            >
              <Search className="w-[19px] h-[19px]" strokeWidth={2.25} />
            </button>
            {!loading && products.length > 0 && <OtcFilterToggle checked={otcOnly} onChange={setOtcOnly} />}
          </div>
        </div>
      </div>

      {/* ══ المحتوى ══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-52 skeleton rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-6 text-center py-20 bg-white rounded-3xl border border-gray-100">
            <LayoutGrid className="w-14 h-14 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('لا توجد منتجات')}</h3>
            <p className="text-gray-500 text-sm">{t('لا توجد منتجات في هذه الفئة حالياً')}</p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="mt-6 py-12 text-center bg-white rounded-3xl border border-gray-100">
            <p className="text-slate-500 text-sm font-extrabold">{t('لا توجد منتجات بدون وصفة طبية')}</p>
          </div>
        ) : (
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                showCategory={isAll}
                pharmacyName={
                  lang === 'en'
                    ? product.pharmacy?.name_en || product.pharmacy?.name || ''
                    : product.pharmacy?.name || ''
                }
                onClick={
                  product.for_all_pharmacies ? undefined : () => navigate({ name: 'pharmacy', id: product.pharmacy_id })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
