import { useMemo, useState } from 'react';
import { TrendingUp, Search, X, Flame, Package, ArrowLeft } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { ProductCard } from '@/components/ProductCard';
import { readSearchHistory, clearSearchHistory } from '@/lib/searchHistory';
import type { Product } from '@/types';

interface Props {
  products: Product[];
}

export function MostSearched({ products }: Props) {
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const [, setVersion] = useState(0);

  const history = readSearchHistory();

  const handleClear = () => {
    clearSearchHistory();
    setVersion((v) => v + 1);
  };

  const matchedProducts = useMemo(() => {
    if (history.length === 0) return [];
    const byPharmacy = new Map<string, Product>();
    for (const term of history) {
      const q = term.toLowerCase();
      const matches = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.name_en?.toLowerCase().includes(q) ?? false) ||
          (p.active_ingredient?.toLowerCase().includes(q) ?? false)
      );
      for (const m of matches) {
        if (!byPharmacy.has(`${m.id}:${m.pharmacy_id}`)) {
          byPharmacy.set(`${m.id}:${m.pharmacy_id}`, m);
        }
      }
    }
    return Array.from(byPharmacy.values()).slice(0, 4);
  }, [products, history]);

  if (history.length === 0 && matchedProducts.length === 0) return null;

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1 rounded-full"
              style={{ backgroundColor: `${themeColors.accentColor}15`, color: themeColors.accentColor }}
            >
              <TrendingUp className="w-4 h-4" />
              الأكثر بحثاً
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              عمليات بحثك الأخيرة
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 font-bold">تابع من حيث توقفت أو أعد البحث بضغطة واحدة</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              مسح السجل
            </button>
          )}
        </div>

        {/* Recent search chips */}
        {history.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {history.map((term, i) => (
              <button
                key={`${term}-${i}`}
                onClick={() => navigate({ name: 'search', query: term })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-200 text-xs font-extrabold text-slate-700 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <Search className="w-3.5 h-3.5" style={{ color: themeColors.accentColor }} />
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Matched products */}
        {matchedProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4" style={{ color: themeColors.accentColor }} />
              <h3 className="text-sm font-extrabold text-slate-800">منتجات ننصح بها بناءً على بحثك</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {matchedProducts.map((product) => (
                <ProductCard
                  key={`${product.id}:${product.pharmacy_id}`}
                  product={product}
                  pharmacyName={product.pharmacy?.name}
                  onClick={product.for_all_pharmacies ? undefined : () => navigate({ name: 'pharmacy', id: product.pharmacy_id })}
                />
              ))}
            </div>
            <button
              onClick={() => navigate({ name: 'search', query: '' })}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-extrabold text-gray-800 hover:bg-slate-50 transition-all shadow-2xs group"
            >
              <span>تصفح كل المنتجات</span>
              <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {matchedProducts.length === 0 && (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">لا توجد منتجات مطابقة لبحثك الأخير حالياً</p>
          </div>
        )}
      </div>
    </section>
  );
}
