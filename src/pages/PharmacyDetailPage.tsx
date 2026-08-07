import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, MapPin, Phone, MessageCircle, Star, Clock, Truck, Mail, Search, Pill, Navigation2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ProductCard } from '@/components/ProductCard';
import { ReviewsSection } from '@/components/ReviewsSection';
import { formatDistance, getPharmacyWithDistance } from '@/lib/distance';
import { getDirectionsUrl } from '@/lib/directions';
import type { Pharmacy, Product, Category } from '@/types';

interface Props {
  id: string;
}

export function PharmacyDetailPage({ id }: Props) {
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const { location } = useGeolocation();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [pharmRes, prodRes] = await Promise.all([
        supabase.from('pharmacies').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('products')
          .select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)')
          .or(`pharmacy_id.eq.${id},for_all_pharmacies.eq.true`)
          .order('name'),
      ]);
      setPharmacy(pharmRes.data as Pharmacy | null);
      setProducts((prodRes.data || []) as Product[]);

      const catIds = new Set((prodRes.data || []).map((p: Product) => p.category_id).filter(Boolean));
      if (catIds.size > 0) {
        const { data: cats } = await supabase
          .from('categories')
          .select('*')
          .in('id', Array.from(catIds))
          .order('name');
        setCategories((cats || []) as Category[]);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const pharmacyWithDistance = useMemo(() => {
    if (!pharmacy) return null;
    return getPharmacyWithDistance(pharmacy, location?.latitude, location?.longitude);
  }, [pharmacy, location]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) {
      result = result.filter((p) => p.category_id === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.name_en?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [products, search, activeCategory]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-52 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">الصيدلية غير موجودة</h2>
        <button onClick={() => navigate({ name: 'home' })} className="text-[var(--color-primary)] font-medium">
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Cover */}
      <div className="relative h-56 sm:h-80 overflow-hidden">
        {pharmacy.cover_url ? (
          <img src={pharmacy.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${themeColors.pharmacyHeaderBg}, ${themeColors.priceColor})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-slate-900/30" />
        <button
          onClick={() => navigate({ name: 'home' })}
          className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-white transition-all shadow-lg hover:-translate-x-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
          رجوع
        </button>

        {/* Open badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          مفتوح الآن
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Pharmacy identity card */}
        <div className="relative z-10 -mt-20 sm:-mt-24">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-100 p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Logo */}
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center shrink-0 ring-4 shadow-xl overflow-hidden"
                style={{ backgroundColor: themeColors.pharmacyHeaderBg }}
              >
                {pharmacy.logo_url ? (
                  <img src={pharmacy.logo_url} alt={pharmacy.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-5xl">{pharmacy.name.charAt(0)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{pharmacy.name}</h1>
                  {pharmacy.is_24h && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold text-white shadow" style={{ backgroundColor: themeColors.tabActiveBg }}>
                      <Clock className="w-3 h-3" /> 24 ساعة
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-700">{pharmacy.rating}</span>
                    <span className="text-xs text-amber-600 font-medium">تقييم</span>
                  </span>
                  {pharmacy.area && (
                    <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {pharmacy.area}{pharmacy.city ? `، ${pharmacy.city}` : ''}
                    </span>
                  )}
                  {pharmacyWithDistance?.distance != null && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: `${themeColors.accentColor}15`, color: themeColors.accentColor }}
                    >
                      <Navigation2 className="w-3.5 h-3.5" />
                      على بُعد {formatDistance(pharmacyWithDistance.distance)}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact buttons */}
              <div className="flex gap-2.5 w-full sm:w-auto">
                {pharmacy.phone && (
                  <a
                    href={`tel:${pharmacy.phone}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-bold transition-all hover:scale-[1.03] active:scale-95 shadow-lg"
                    style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
                  >
                    <Phone className="w-4 h-4" />
                    اتصال
                  </a>
                )}
                {pharmacy.whatsapp && (
                  <a
                    href={`https://wa.me/${pharmacy.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-bold transition-all hover:scale-[1.03] active:scale-95 shadow-lg"
                    style={{ backgroundColor: themeColors.whatsappBtnBg }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    واتساب
                  </a>
                )}
                <a
                  href={getDirectionsUrl({ latitude: pharmacy.latitude, longitude: pharmacy.longitude })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all hover:scale-[1.03] active:scale-95 shadow-lg"
                >
                  <Navigation2 className="w-4 h-4" />
                  الاتجاهات
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 mb-8">
          <div className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3 transition-all" style={{ backgroundColor: themeColors.cardBg }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${themeColors.priceColor}12` }}>
              <Clock className="w-5 h-5" style={{ color: themeColors.priceColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: themeColors.cardMutedText }}>ساعات العمل</p>
              <p className="text-sm font-bold truncate" style={{ color: themeColors.cardText }}>{pharmacy.opening_hours || 'غير محدد'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3 transition-all" style={{ backgroundColor: themeColors.cardBg }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${themeColors.accentColor}12` }}>
              <Truck className="w-5 h-5" style={{ color: themeColors.accentColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: themeColors.cardMutedText }}>التوصيل</p>
              <p className="text-sm font-bold truncate" style={{ color: themeColors.cardText }}>
                {pharmacy.delivery_available ? `متاح - ${pharmacy.delivery_fee} ج.م` : 'غير متاح'}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3 transition-all" style={{ backgroundColor: themeColors.cardBg }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${themeColors.sectionHeadingText}12` }}>
              <Mail className="w-5 h-5" style={{ color: themeColors.sectionHeadingText }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: themeColors.cardMutedText }}>البريد الإلكتروني</p>
              <p className="text-sm font-bold truncate" style={{ color: themeColors.cardText }}>{pharmacy.email || 'غير متاح'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3 transition-all" style={{ backgroundColor: themeColors.cardBg }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: themeColors.pageSearchBg }}>
              <MapPin className="w-5 h-5" style={{ color: themeColors.pageSearchText }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: themeColors.cardMutedText }}>العنوان</p>
              <p className="text-sm font-bold truncate" style={{ color: themeColors.cardText }}>{pharmacy.address}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {pharmacy.description && (
          <div className="rounded-2xl border border-gray-100 p-5 mb-8 relative overflow-hidden" style={{ backgroundColor: themeColors.cardBg }}>
            <div className="absolute top-0 right-0 w-1 h-full" style={{ backgroundColor: themeColors.priceColor }} />
            <p className="leading-relaxed" style={{ color: themeColors.cardMutedText }}>{pharmacy.description}</p>
          </div>
        )}

        {/* Products Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-black" style={{ color: themeColors.sectionHeadingText }}>المنتجات المتاحة</h2>
              <p className="text-sm font-medium mt-0.5" style={{ color: themeColors.sectionSubheadingText }}>{filteredProducts.length} منتج في صيدلية {pharmacy.name}</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث داخل الصيدلية..."
                className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-transparent focus:ring-2 text-sm"
                style={{ backgroundColor: themeColors.pageSearchBg, color: themeColors.pageSearchText, ['--tw-ring-color' as string]: themeColors.priceColor }}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: themeColors.pageSearchText }} />
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  !activeCategory ? 'text-white shadow-md' : 'border border-gray-200 hover:bg-gray-50'
                }`}
                style={!activeCategory
                  ? { backgroundColor: themeColors.tabActiveBg, boxShadow: `0 6px 14px -6px ${themeColors.tabActiveBg}88` }
                  : { backgroundColor: themeColors.cardBg, color: themeColors.cardMutedText }}
              >
                الكل
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    activeCategory === cat.id ? 'text-white shadow-md' : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                  style={activeCategory === cat.id
                    ? { backgroundColor: themeColors.tabActiveBg, boxShadow: `0 6px 14px -6px ${themeColors.tabActiveBg}88` }
                    : { backgroundColor: themeColors.cardBg, color: themeColors.cardMutedText }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <Pill className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-bold">لا توجد منتجات مطابقة</p>
              <p className="text-xs text-gray-400 mt-1">جرّب كلمة بحث مختلفة أو تصفّح فئة أخرى</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Customer Reviews */}
        <ReviewsSection pharmacyId={pharmacy.id} pharmacyName={pharmacy.name} />
      </div>
    </div>
  );
}
