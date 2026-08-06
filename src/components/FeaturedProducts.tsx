import { useState } from 'react';
import { BadgePercent, Sparkles, Package, ChevronLeft } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  loading?: boolean;
}

type ProductTab = 'discounts' | 'newest' | 'all';

export function FeaturedProducts({ products, loading }: Props) {
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<ProductTab>('discounts');

  const discountProducts = products.filter((p) => p.discounts?.some((d) => d.is_active)).slice(0, 4);
  const newestProducts = [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);
  const allProducts = products.slice(0, 8);

  const displayed =
    activeTab === 'discounts' ? discountProducts : activeTab === 'newest' ? newestProducts : allProducts;

  const tabs: { id: ProductTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'discounts', label: 'عروض الخصم', icon: <BadgePercent className="w-4 h-4" />, count: discountProducts.length },
    { id: 'newest', label: 'الأحدث وصولاً', icon: <Sparkles className="w-4 h-4" />, count: newestProducts.length },
    { id: 'all', label: 'كل المنتجات', icon: <Package className="w-4 h-4" />, count: allProducts.length },
  ];

  return (
    <section className="py-12 relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span
              className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border"
              style={{
                backgroundColor: `${themeColors.primaryColor}15`,
                color: themeColors.primaryColor,
                borderColor: `${themeColors.primaryColor}30`
              }}
            >
              أحدث المنتجات والعروض
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">منتجاتنا المميزة</h2>
            <p className="text-sm text-slate-500 mt-1.5 font-bold">اختر من بين أحدث الواصل والخصومات المتاحة</p>
          </div>

          <button
            onClick={() => navigate({ name: 'search', query: '' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-extrabold text-gray-800 hover:bg-slate-50 transition-all shadow-2xs group self-start sm:self-auto"
          >
            <span>عرض جميع المنتجات</span>
            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>

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
              <div key={i} className="bg-slate-100 rounded-3xl h-72 animate-pulse" />
            ))}
          </div>
        ) : displayed.length > 0 ? (
          <div key={activeTab} className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {displayed.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                pharmacyName={product.pharmacy?.name}
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
