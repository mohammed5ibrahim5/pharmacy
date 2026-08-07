import { useState, useEffect } from 'react';
import { ArrowLeft, Pill, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { ProductCard } from '@/components/ProductCard';
import type { Product, Category } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  slug: string;
}

export function CategoryPage({ slug }: Props) {
  const { t, lang } = useLanguage();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: cat } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      setCategory(cat as Category | null);

      if (cat) {
        const { data: prods } = await supabase
          .from('products')
          .select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)')
          .eq('category_id', (cat as Category).id)
          .eq('is_available', true)
          .order('name');
        setProducts((prods || []) as Product[]);
      }
      setLoading(false);
    };
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-52 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
      <div className="relative rounded-3xl p-8 mb-8 overflow-hidden border shadow-2xs"
        style={{ background: `linear-gradient(135deg, ${themeColors.pharmacyHeaderBg}, ${themeColors.sectionBg})`, borderColor: `${themeColors.priceColor}20` }}>
        <div className="absolute inset-0 bg-[radial-gradient(transparent_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-10" />
        <div className="absolute -top-16 -start-16 w-48 h-48 rounded-full opacity-[0.1] blur-3xl" style={{ backgroundColor: themeColors.priceColor }} />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border" style={{ backgroundColor: themeColors.cardBg, borderColor: `${themeColors.priceColor}20` }}>
            <Pill className="w-8 h-8" style={{ color: themeColors.priceColor }} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black" style={{ color: themeColors.sectionHeadingText }}>{category ? (lang === 'en' ? (category.name_en || t(category.name)) : category.name) : t('الفئة')}</h1>
            <p className="font-bold text-xs mt-1 flex items-center gap-1.5" style={{ color: themeColors.priceColor }}>
              <Package className="w-4 h-4" />
              {t('{0} منتج متاح حالياً', [products.length])}
            </p>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <Pill className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('لا توجد منتجات')}</h3>
          <p className="text-gray-500">{t('لا توجد منتجات في هذه الفئة حالياً')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              pharmacyName={product.pharmacy?.name}
              onClick={product.for_all_pharmacies ? undefined : () => navigate({ name: 'pharmacy', id: product.pharmacy_id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
