import { useState, useMemo } from 'react';
import { BadgePercent, Sparkles, Package, ChevronLeft, Clock, Flame } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { ProductCard } from '@/components/ProductCard';
import { useCountdown } from '@/hooks/useCountdown';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  loading?: boolean;
  popularProductIds?: string[];
}

type ProductTab = 'discounts' | 'newest' | 'all';

export function FeaturedProducts({ products, loading, popularProductIds = [] }: Props) {
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<ProductTab>('discounts');

  const discountProducts = products.filter((p) => p.discounts?.some((d) => d.is_active)).slice(0, 4);
  const newestProducts = [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);
  const allProducts = products.slice(0, 8);

  const flashSaleEnd = useMemo(() => {
    const ends: Date[] = [];
    products.forEach((p) => {
      p.discounts?.forEach((d) => {
        if (d.is_active && d.end_date) {
          const t = new Date(d.end_date);
          if (t.getTime() > Date.now()) ends.push(t);
        }
      });
    });
    if (ends.length === 0) return null;
    return new Date(Math.min(...ends.map((d) => d.getTime())));
  }, [products]);

  const countdown = useCountdown(flashSaleEnd);

  const displayed =
    activeTab === 'discounts' ? discountProducts : activeTab === 'newest' ? newestProducts : allProducts;

  const tabs: { id: ProductTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'discounts', label: 'عروض الخصم', icon: <BadgePercent className="w-4 h-4" />, count: discountProducts.length },
    { id: 'newest', label: 'الأحدث وصولاً', icon: <Sparkles className="w-4 h-4" />, count: newestProducts.length },
    { id: 'all', label: 'كل المنتجات', icon: <Package className="w-4 h-4" />, count: allProducts.length },
  ];

  return (
    <section className="py-12 relative overflow-hidden" style={{ backgroundColor: themeColors.sectionBg }}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span
              className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border"
              style={{
                backgroundColor: `${themeColors.badgePillBg}15`,
                color: themeColors.badgePillText,
                borderColor: `${themeColors.badgePillBg}30`
              }}
            >
              أحدث المنتجات والعروض
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mt-2" style={{ color: themeColors.sectionHeadingText }}>منتجاتنا المميزة</h2>
            <p className="text-sm mt-1.5 font-bold" style={{ color: themeColors.sectionSubheadingText }}>اختر من بين أحدث الواصل والخصومات المتاحة</p>
          </div>

          <button
            onClick={() => navigate({ name: 'search', query: '' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-extrabold text-gray-800 hover:bg-slate-50 transition-all shadow-2xs group self-start sm:self-auto"
          >
            <span>عرض جميع المنتجات</span>
            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>

        {/* Flash sale countdown banner */}
        {activeTab === 'discounts' && countdown && discountProducts.length > 0 && (
          <div
            className="relative overflow-hidden rounded-3xl mb-8 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ background: `linear-gradient(120deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center animate-pulse">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-lg sm:text-xl flex items-center gap-2">
                  عرض العصر! خصومات تنتهي قريباً
                  <BadgePercent className="w-5 h-5" />
                </p>
                <p className="text-xs text-white/80 font-bold mt-0.5">اغتنم الخصم قبل انتهاء الوقت المحدد</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2" dir="ltr">
              <Clock className="w-5 h-5 text-white/70" />
              {[
                { value: countdown.days, label: 'يوم' },
                { value: countdown.hours, label: 'ساعة' },
                { value: countdown.minutes, label: 'دقيقة' },
                { value: countdown.seconds, label: 'ثانية' },
              ].map((unit, i) => (
                <div key={unit.label} className="flex items-center gap-2">
                  <div className="bg-black/25 backdrop-blur border border-white/20 rounded-xl px-2.5 py-1.5 text-center min-w-[3.4rem]">
                    <p className="text-xl font-black tabular-nums leading-none">{String(unit.value).padStart(2, '0')}</p>
                    <p className="text-[10px] text-white/70 font-bold mt-0.5">{unit.label}</p>
                  </div>
                  {i < 3 && <span className="text-white/60 font-black text-lg">:</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-black transition-all duration-300 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'bg-white border border-gray-200 text-slate-600 hover:border-gray-300 hover:text-slate-900'
                }`}
                style={isActive ? { backgroundColor: themeColors.primaryColor, boxShadow: `0 8px 18px -6px ${themeColors.primaryColor}77` } : {}}
              >
                {tab.icon}
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton rounded-3xl h-72" />
            ))}
          </div>
        ) : displayed.length > 0 ? (
          <div key={activeTab} className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {displayed.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                pharmacyName={product.pharmacy?.name}
                popular={popularProductIds.includes(product.id)}
                onClick={product.for_all_pharmacies ? undefined : () => navigate({ name: 'pharmacy', id: product.pharmacy_id })}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-3xl border border-gray-200">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-extrabold">لا توجد منتجات بهذا التصنيف حالياً</p>
          </div>
        )}
      </div>
    </section>
  );
}
