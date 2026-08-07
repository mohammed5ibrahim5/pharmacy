import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  MapPin,
  Navigation,
  Pill,
  Truck,
  TrendingDown,
  ChevronLeft,
  Sparkles,
  Stethoscope,
  Shield,
  Heart,
  Package,
  BadgeCheck,
  BadgePercent,
  ShieldCheck,
  PhoneCall,
  Users,
  ShoppingBag,
  Send,
  Store,
  Barcode,
  FileText,
  Mic,
  Zap,
  Droplet,
  Baby,
  Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { PharmacyCard } from '@/components/PharmacyCard';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { LocationSelectorModal } from '@/components/LocationSelectorModal';
import { PrescriptionUploadModal } from '@/components/PrescriptionUploadModal';
import { getPharmacyWithDistance, sortPharmaciesByDistance } from '@/lib/distance';
import { findAreaLocation } from '@/lib/areaLocations';
import { trackSearch } from '@/lib/searchHistory';
import { PHARMACY_SECTIONS_META, type PharmacySectionKey } from '@/lib/pharmacySections';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { HomeHowItWorks } from '@/components/HomeHowItWorks';
import { HomeTestimonials } from '@/components/HomeTestimonials';
import { HomeHealthTips } from '@/components/HomeHealthTips';
import { HomeFAQ } from '@/components/HomeFAQ';
import { CustomerServiceBanner } from '@/components/CustomerServiceBanner';
import { PharmacyMap } from '@/components/PharmacyMap';
import { MostSearched } from '@/components/MostSearched';
import { Reveal } from '@/components/Reveal';
import { CountUp, parseStatValue } from '@/components/CountUp';
import type { Pharmacy, Product, Category } from '@/types';

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
}

type SpeechRecognitionWindow = typeof window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode; color: string; count: string }> = {
  painkillers: { icon: <Pill className="w-7 h-7" />, color: '#0d9488', count: '45+ دواء' },
  antibiotics: { icon: <Shield className="w-7 h-7" />, color: '#2563eb', count: '30+ منتج' },
  supplements: { icon: <Sparkles className="w-7 h-7" />, color: '#d97706', count: '60+ مكمل' },
  'cold-flu': { icon: <Stethoscope className="w-7 h-7" />, color: '#dc2626', count: '25+ علاج' },
  vitamins: { icon: <Heart className="w-7 h-7" />, color: '#7c3aed', count: '50+ فيتامين' },
  'skin-care': { icon: <Droplet className="w-7 h-7" />, color: '#db2777', count: '35+ منتج' },
  'baby-care': { icon: <Baby className="w-7 h-7" />, color: '#e11d48', count: '40+ مستلزم' },
  digestive: { icon: <Activity className="w-7 h-7" />, color: '#16a34a', count: '30+ دواء' },
};

const HERO_TRENDING = [
  'بنادول اكسترا',
  'كونجستال',
  'أوميجا 3 بلس',
  'سي ريتارد',
  'أوجمنتين 1 جم',
  'سيتامول',
  'كمامات طبية',
];

const DEFAULT_HERO_STATS: { id: string; value: string; sub: string; desc: string; icon: string; auto?: boolean }[] = [
  { id: 'pharmacies', value: '5+', sub: 'صيدلية شريكة', desc: 'معتمدة ومجاوِرة لك', icon: 'store', auto: true },
  { id: 'products', value: '8+', sub: 'منتج متاح', desc: 'تحديث يومي للأسعار', icon: 'package', auto: true },
  { id: 'delivery', value: '24/7', sub: 'خدمة توصيل', desc: 'شحن آمن وسريع', icon: 'truck' },
];

function statIcon(key: string): React.ReactNode {
  switch (key) {
    case 'store': return <Store className="w-6 h-6" />;
    case 'package': return <Package className="w-6 h-6" />;
    case 'users': return <Users className="w-6 h-6" />;
    case 'truck': return <Truck className="w-6 h-6" />;
    case 'pills': return <Pill className="w-6 h-6" />;
    default: return <Sparkles className="w-6 h-6" />;
  }
}

function statIconColor(key: string, colors: typeof import('@/context/SettingsContext').DEFAULT_THEME_COLORS): string {
  switch (key) {
    case 'store': return colors.primaryColor;
    case 'package': return colors.secondaryColor;
    case 'users': return colors.accent2Color;
    case 'truck': return colors.accent2Color;
    default: return colors.accent2Color;
  }
}

function formatStatCount(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')}k+`;
  }
  return `${n}+`;
}

function statDisplayValue(stat: { id: string; value: string; auto?: boolean }, pharmacyCount: number, productCount: number): string {
  if (stat.auto) {
    if (stat.id === 'pharmacies') return formatStatCount(pharmacyCount);
    if (stat.id === 'products') return formatStatCount(productCount);
  }
  return stat.value;
}

type PharmacyTab = 'nearest' | 'highest_rated' | 'most_popular' | 'delivery' | '24h';

export function HomePage() {
  const { settings, themeColors, heroConfig, storeConfig } = useSettings();
  const { navigate } = useRouter();
  const { location, requestLocation, loading, permissionDenied, setUserLocation } = useGeolocation();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [pharmacyCount, setPharmacyCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [popularProductIds, setPopularProductIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [heroFloatingVisible, setHeroFloatingVisible] = useState(true);

  // Manual section membership from admin (pharmacy_sections)
  const [pharmacySections, setPharmacySections] = useState<Record<string, string[]>>({});
  const [sectionsLoaded, setSectionsLoaded] = useState(false);

  // Active Pharmacy Tab State
  const [activePharmacyTab, setActivePharmacyTab] = useState<PharmacyTab>('nearest');

  // Modals state
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Nearest tab requires the user to set their location in this session
  const [locationSet, setLocationSet] = useState(() => sessionStorage.getItem('pharmacy_location_set') === '1');
  const markLocationSet = () => {
    sessionStorage.setItem('pharmacy_location_set', '1');
    setLocationSet(true);
  };

  const handleManualLocation = (loc: string, coords?: { latitude: number; longitude: number }) => {
    setUserLocationName(loc);
    localStorage.setItem('user_delivery_location', loc);
    if (coords) {
      setUserLocation(coords.latitude, coords.longitude);
    } else {
      const areaCoords = findAreaLocation(loc);
      if (areaCoords) {
        setUserLocation(areaCoords.latitude, areaCoords.longitude);
      }
    }
    markLocationSet();
  };

  const [userLocationName, setUserLocationName] = useState<string>(() => {
    return localStorage.getItem('user_delivery_location') || 'القاهرة - المعادي';
  });

  useEffect(() => {
    const onScroll = () => setHeroFloatingVisible(window.scrollY < 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [pharmRes, prodRes, catRes, ordersRes, sectionsRes, pharmCountRes, prodCountRes] = await Promise.all([
        supabase.from('pharmacies').select('*').eq('is_active', true),
        supabase.from('products').select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)').eq('is_available', true).limit(20),
        supabase.from('categories').select('*').order('name'),
        supabase.from('orders').select('pharmacy_id, product_id, status'),
        supabase.from('pharmacy_sections').select('pharmacy_id, section_key'),
        supabase.from('pharmacies').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_available', true),
      ]);
      setPharmacies(pharmRes.data || []);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      setPharmacyCount(pharmCountRes.count || 0);
      setProductCount(prodCountRes.count || 0);

      const popularity = new Map<string, number>();
      (ordersRes.data || []).forEach((o) => {
        if (o.status === 'cancelled' || !o.product_id) return;
        popularity.set(o.product_id, (popularity.get(o.product_id) || 0) + 1);
      });
      setPopularProductIds(
        Array.from(popularity.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id]) => id)
      );

      const counts: Record<string, number> = {};
      (ordersRes.data || []).forEach((order) => {
        counts[order.pharmacy_id] = (counts[order.pharmacy_id] || 0) + 1;
      });
      setOrderCounts(counts);

      if (sectionsRes.error) {
        setSectionsLoaded(false);
      } else {
        const map: Record<string, string[]> = {};
        (sectionsRes.data || []).forEach((row) => {
          if (!map[row.section_key]) map[row.section_key] = [];
          if (!map[row.section_key].includes(row.pharmacy_id)) {
            map[row.section_key].push(row.pharmacy_id);
          }
        });
        setPharmacySections(map);
        setSectionsLoaded(true);
      }

      setLoadingData(false);
    };
    fetchData();
  }, []);

  const sortedPharmacies = useMemo(() => {
    const withDistance = pharmacies.map((p) =>
      getPharmacyWithDistance(p, location?.latitude, location?.longitude)
    );
    return sortPharmaciesByDistance(withDistance).slice(0, 6);
  }, [pharmacies, location]);

  const highestRatedPharmacies = useMemo(() => {
    if (sectionsLoaded) {
      const ids = pharmacySections['highest_rated'] || [];
      return pharmacies
        .filter((p) => ids.includes(p.id))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 6);
    }
    return [...pharmacies].sort((a, b) => b.rating - a.rating).slice(0, 6);
  }, [pharmacies, pharmacySections, sectionsLoaded]);

  const mostPopularPharmacies = useMemo(() => {
    if (sectionsLoaded) {
      const ids = pharmacySections['most_popular'] || [];
      return pharmacies
        .filter((p) => ids.includes(p.id))
        .sort((a, b) => (orderCounts[b.id] || 0) - (orderCounts[a.id] || 0))
        .slice(0, 6);
    }
    return [...pharmacies]
      .sort((a, b) => (orderCounts[b.id] || 0) - (orderCounts[a.id] || 0))
      .slice(0, 6);
  }, [pharmacies, pharmacySections, sectionsLoaded, orderCounts]);

  const deliveryPharmacies = useMemo(() => {
    if (sectionsLoaded) {
      const ids = pharmacySections['delivery'] || [];
      return pharmacies.filter((p) => ids.includes(p.id)).slice(0, 6);
    }
    return pharmacies.filter((p) => p.delivery_available).slice(0, 6);
  }, [pharmacies, pharmacySections, sectionsLoaded]);

  const pharmacies24h = useMemo(() => {
    if (sectionsLoaded) {
      const ids = pharmacySections['24h'] || [];
      return pharmacies.filter((p) => ids.includes(p.id)).slice(0, 6);
    }
    return pharmacies.filter((p) => p.is_24h).slice(0, 6);
  }, [pharmacies, pharmacySections, sectionsLoaded]);

  const displayedPharmacies = useMemo(() => {
    switch (activePharmacyTab) {
      case 'nearest':
        return sortedPharmacies;
      case 'highest_rated':
        return highestRatedPharmacies;
      case 'most_popular':
        return mostPopularPharmacies;
      case 'delivery':
        return deliveryPharmacies;
      case '24h':
        return pharmacies24h;
      default:
        return sortedPharmacies;
    }
  }, [
    activePharmacyTab,
    sortedPharmacies,
    highestRatedPharmacies,
    mostPopularPharmacies,
    deliveryPharmacies,
    pharmacies24h,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      trackSearch(searchQuery.trim());
      navigate({ name: 'search', query: searchQuery.trim() });
    }
  };

  const handleVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const srWindow = window as SpeechRecognitionWindow;
      const SpeechRecognitionCtor = srWindow.SpeechRecognition || srWindow.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) return;
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'ar-EG';
      recognition.interimResults = false;
      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        navigate({ name: 'search', query: transcript });
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      alert('البحث الصوتي غير مدعوم في هذا المتصفح.');
    }
  };

  return (
    <div className="overflow-hidden bg-slate-50/60">
      {/* ==================== HERO SECTION ==================== */}
      <section
        className="relative overflow-hidden pt-10 sm:pt-16 pb-28 sm:pb-32 border-b transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${themeColors.heroBgStart}, ${themeColors.heroBgMiddle}, ${themeColors.heroBgEnd})`,
          borderColor: `${themeColors.primaryColor}15`
        }}
      >
        {/* Glow Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 blur-[130px] animate-pulse"
            style={{ backgroundColor: themeColors.primaryColor }}
          />
          <div
            className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full opacity-15 blur-[110px] animate-float"
            style={{ backgroundColor: themeColors.secondaryColor }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.04)_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-20" />
        </div>

        {/* Floating Decorative Elements — single tidy trust bar that hides on scroll */}
        <div
          className="absolute bottom-5 left-[5%] hidden lg:flex items-center gap-2.5 pointer-events-none transition-all duration-500"
          style={{
            opacity: heroFloatingVisible ? 1 : 0,
            transform: heroFloatingVisible ? 'translateY(0)' : 'translateY(16px)'
          }}
        >
          <div
            className="flex items-center gap-2 rounded-full px-3.5 py-2 backdrop-blur-md shadow-lg border"
            style={{
              backgroundColor: `${themeColors.headerBg}e6`,
              borderColor: `${themeColors.primaryColor}22`
            }}
          >
            <Truck className="w-4 h-4 shrink-0" style={{ color: themeColors.accent2Color }} />
            <div className="leading-tight">
              <p className="text-[11px] font-black" style={{ color: themeColors.heroText }}>توصيل فوري</p>
              <p className="text-[9px] font-bold" style={{ color: themeColors.primaryColor }}>أقل من 30 دقيقة</p>
            </div>
          </div>

          <div
            className="flex items-center gap-2 rounded-full px-3.5 py-2 backdrop-blur-md shadow-lg border"
            style={{
              backgroundColor: `${themeColors.headerBg}e6`,
              borderColor: `${themeColors.primaryColor}22`
            }}
          >
            <BadgePercent className="w-4 h-4 shrink-0" style={{ color: themeColors.accentColor }} />
            <div className="leading-tight">
              <p className="text-[11px] font-black" style={{ color: themeColors.heroText }}>خصومات وتخفيضات</p>
              <p className="text-[9px] font-bold" style={{ color: themeColors.accentColor }}>عروض تصل إلى 30%</p>
            </div>
          </div>

          <div
            className="flex items-center gap-2 rounded-full px-3.5 py-2 backdrop-blur-md shadow-lg border"
            style={{
              backgroundColor: `${themeColors.headerBg}e6`,
              borderColor: `${themeColors.primaryColor}22`
            }}
          >
            <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: themeColors.accent2Color }} />
            <p className="text-[11px] font-black whitespace-nowrap" style={{ color: themeColors.heroText }}>
              صيدليات معتمدة 100%
            </p>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            {/* Top Pill Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border shadow-2xs backdrop-blur-md animate-fade-up"
              style={{
                backgroundColor: `${themeColors.primaryColor}15`,
                color: themeColors.primaryColor,
                borderColor: `${themeColors.primaryColor}30`
              }}
            >
              <Zap className="w-4 h-4 animate-pulse" />
              <span>المنصة الأولى للبحث عن الأدوية والصيدليات القريبة</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.2] tracking-tight animate-fade-up" style={{ color: themeColors.heroText, animationDelay: '0.1s' }}>
              اعثر على <span className="text-transparent bg-clip-text bg-gradient-to-l" style={{ backgroundImage: `linear-gradient(to left, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}>دوائك في أقرب صيدلية</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed font-bold animate-fade-up opacity-80" style={{ color: themeColors.heroText, animationDelay: '0.2s' }}>
              ابحث عن الأدوية والمستلزمات الطبية، قارن الأقرب إليك، واطلب التوصيل المباشر لباب المنزل على مدار الساعة.
            </p>

            {/* MAIN SEARCH FORM */}
            {heroConfig.showSearch && (
            <div className="pt-2 animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <div
                  className="relative flex items-center rounded-3xl shadow-xl border-2 p-2 transition-all group bg-white"
                  style={{ borderColor: `${themeColors.primaryColor}33` }}
                >
                  <div className="flex items-center gap-1 sm:gap-2 pr-2 sm:pr-3 pl-1 sm:pl-2 border-r border-gray-200 shrink-0">
                    <button
                      type="button"
                      onClick={handleVoiceSearch}
                      className={`p-1.5 sm:p-2 rounded-xl text-gray-400 hover:bg-teal-50 transition-colors ${
                        isListening ? 'text-red-500 animate-bounce' : ''
                      }`}
                      style={{ color: isListening ? '#ef4444' : themeColors.accent2Color }}
                      title="بحث بالصوت"
                    >
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setBarcodeModalOpen(true)}
                      className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-xl transition-colors text-xs font-bold border"
                      style={{
                        backgroundColor: `${themeColors.accent2Color}10`,
                        color: themeColors.accent2Color,
                        borderColor: `${themeColors.accent2Color}30`
                      }}
                      title="مسح باركود وتصوير الدواء"
                    >
                      <Barcode className="w-4 h-4" />
                      <span className="hidden sm:inline">باركود</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={heroConfig.searchPlaceholder}
                    className="flex-1 min-w-0 px-3 py-3.5 text-slate-900 text-sm sm:text-base font-bold placeholder:font-normal placeholder:text-gray-400 focus:outline-none bg-transparent"
                  />

                  <button
                    type="submit"
                    className="px-4 sm:px-8 py-3.5 rounded-2xl text-white font-black text-sm sm:text-base flex items-center gap-2 transition-all duration-300 hover:scale-[1.03] hover:brightness-110 active:scale-95 shrink-0"
                    style={{
                      backgroundColor: themeColors.heroBtnBg,
                      color: themeColors.heroBtnText,
                      boxShadow: `0 12px 24px -8px ${themeColors.heroBtnBg}99, 0 4px 14px -4px ${themeColors.heroBtnBg}66`
                    }}
                  >
                    <Search className="w-5 h-5" />
                    <span className="hidden sm:inline">بحث</span>
                  </button>
                </div>
              </form>

              {heroConfig.showTrending && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs font-bold">
                <span className="opacity-60 font-bold flex items-center gap-1" style={{ color: themeColors.heroText }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: themeColors.accentColor }} />
                  {heroConfig.trendingLabel}
                </span>
                {(heroConfig.trendingKeywords.length > 0 ? heroConfig.trendingKeywords : HERO_TRENDING).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setSearchQuery(item);
                      trackSearch(item);
                      navigate({ name: 'search', query: item });
                    }}
                    className="px-3 py-1 rounded-full border transition-all shadow-2xs font-bold bg-white"
                    style={{
                      borderColor: `${themeColors.primaryColor}33`,
                      color: themeColors.primaryColor
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
              )}
            </div>
            )}

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5 text-xs font-black animate-fade-up" style={{ animationDelay: '0.4s' }}>
              {heroConfig.showPrescriptionButton && (
              <button
                onClick={() => setPrescriptionModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-white shadow-md hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                style={{ backgroundColor: themeColors.primaryColor }}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">{heroConfig.prescriptionButtonText}</span>
              </button>
              )}

              {heroConfig.showLocationButton && (
              <>
              {!location ? (
                <button
                  onClick={() => {
                    markLocationSet();
                    requestLocation();
                  }}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white border text-xs font-bold transition-all active:scale-95 shadow-2xs whitespace-nowrap"
                  style={{
                    color: themeColors.primaryColor,
                    borderColor: `${themeColors.primaryColor}33`
                  }}
                >
                  <Navigation className="w-4 h-4 animate-spin-slow shrink-0" />
                  <span className="truncate">{loading ? 'جاري تحديد موقعك...' : permissionDenied ? 'حدد الموقع يدوياً' : heroConfig.locationButtonText}</span>
                </button>
              ) : (
                <button
                  onClick={() => setLocationModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shadow-2xs whitespace-nowrap"
                  style={{
                    backgroundColor: `${themeColors.primaryColor}15`,
                    color: themeColors.heroText,
                    borderColor: `${themeColors.primaryColor}33`
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full animate-ping shrink-0" style={{ backgroundColor: themeColors.primaryColor }} />
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: themeColors.primaryColor }} />
                  <span className="truncate">{heroConfig.locationSetText}</span>
                </button>
              )}
              </>
              )}
            </div>

            {heroConfig.showPrescriptionButton && (
              <p className="text-[11px] font-bold opacity-70 flex items-center justify-center gap-1.5 animate-fade-up" style={{ color: themeColors.heroText, animationDelay: '0.45s' }}>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.primaryColor }} />
                صوّر الروشتة من هاتفك — يراجعها صيدلي حقيقي مرخّص قبل صرف أي دواء
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ==================== STATS STRIP ==================== */}
      {heroConfig.showStats && (
      <section className="relative z-20 -mt-14 sm:-mt-16 mb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div
            className="rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] border p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 transition-all duration-300"
            style={{
              backgroundColor: themeColors.statsCardBg,
              color: themeColors.statsCardText,
              borderColor: `${themeColors.primaryColor}15`
            }}
          >
            {(heroConfig.stats.length > 0 ? heroConfig.stats : DEFAULT_HERO_STATS)
              .filter((stat) => stat.id !== 'customers')
              .map((stat, i) => (
              <div
                key={i}
                className="p-3 sm:p-4 text-right flex items-center gap-3.5 group hover:bg-black/[0.02] rounded-2xl transition-all"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: `${statIconColor(stat.icon, themeColors)}15`,
                    color: statIconColor(stat.icon, themeColors),
                    borderColor: `${statIconColor(stat.icon, themeColors)}33`
                  }}
                >
                  {statIcon(stat.icon)}
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    {(() => {
                      const parsed = parseStatValue(statDisplayValue(stat, pharmacyCount, productCount));
                      return (
                        <p className="text-xl sm:text-2xl font-black tabular-nums">
                          <CountUp target={parsed.target} suffix={parsed.suffix} />
                        </p>
                      );
                    })()}
                    <span className="text-xs font-bold opacity-80">{stat.sub}</span>
                  </div>
                  <p className="text-[11px] opacity-60 mt-0.5 font-bold">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ==================== CATEGORIES SECTION ==================== */}
      <Reveal>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold mb-2"
              style={{
                backgroundColor: `${themeColors.primaryColor}15`,
                color: themeColors.primaryColor
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              تصفح الأقسام والمجموعات
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">تسوق حسب الفئة</h2>
          </div>

          <button
            onClick={() => navigate({ name: 'search', query: '' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-extrabold text-gray-800 hover:bg-slate-50 transition-all shadow-2xs group"
          >
            <span>عرض جميع الأقسام</span>
            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>

        {loadingData && categories.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton rounded-3xl h-[6.5rem]" />
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {categories.map((cat) => {
            const config = CATEGORY_ICONS[cat.slug] || {
              icon: <Pill className="w-7 h-7" />,
              color: themeColors.primaryColor,
              count: 'متوفر الان',
            };

            return (
              <button
                key={cat.id}
                onClick={() => navigate({ name: 'category', slug: cat.slug })}
                className="group relative flex flex-col items-center p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 text-center overflow-hidden"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2.5 shadow-sm transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `${config.color}15`,
                    color: config.color,
                    border: `1px solid ${config.color}30`,
                  }}
                >
                  {config.icon}
                </div>

                <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1">
                  {cat.name}
                </h3>
              </button>
            );
          })}
        </div>
        )}
      </section>
      </Reveal>

      {/* ==================== PHARMACIES ==================== */}
      <Reveal>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              الصيدليات المتاحة بجوارك
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 font-bold">
              تصفح الصيدليات حسب تصنيف احتياجك
            </p>
          </div>
          <span
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-gray-200 text-xs font-extrabold text-slate-700 shadow-sm self-start sm:self-auto"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColors.primaryColor }} />
            {pharmacies.length} صيدلية معتمدة
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-none">
          {[
            { id: 'nearest', label: 'الأقرب إليك' },
            { id: 'highest_rated', label: 'الأعلى تقييماً' },
            { id: 'most_popular', label: 'الأكثر شعبية' },
            { id: 'delivery', label: 'توصيل سريع' },
            { id: '24h', label: 'طوارئ 24/7' },
          ].map((tab) => {
            const isActive = activePharmacyTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePharmacyTab(tab.id as PharmacyTab)}
                className={`shrink-0 px-4 py-2.5 rounded-full text-xs font-black transition-all duration-300 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'bg-white border border-gray-200 text-slate-600 hover:border-gray-300 hover:text-slate-900'
                }`}
                style={isActive ? { backgroundColor: themeColors.primaryColor, boxShadow: `0 8px 18px -6px ${themeColors.primaryColor}77` } : {}}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Pharmacy cards */}
        {activePharmacyTab === 'nearest' && !(location && locationSet) ? (
          <div className="py-14 text-center bg-white rounded-3xl border border-gray-200">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse-soft"
              style={{ backgroundColor: `${themeColors.primaryColor}12`, color: themeColors.primaryColor }}
            >
              <Navigation className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1.5">حدّد موقعك لعرض أقرب الصيدليات</h3>
            <p className="text-sm text-slate-500 font-bold mb-6 max-w-md mx-auto leading-relaxed">
              عشان نشوفلك أقرب صيدلية لجوّاك، حدد موقعك الحالي أو اختر منطقتك يدوياً.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  markLocationSet();
                  requestLocation();
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white font-black text-xs shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-60 w-full sm:w-auto"
                style={{ backgroundColor: themeColors.primaryColor }}
              >
                <Navigation className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'جاري تحديد موقعك...' : 'تحديد موقعي الآن'}
              </button>
              <button
                onClick={() => setLocationModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border-2 text-xs font-black transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                style={{ color: themeColors.primaryColor, borderColor: `${themeColors.primaryColor}40` }}
              >
                <MapPin className="w-4 h-4" />
                اختيار المنطقة يدوياً
              </button>
            </div>
            {permissionDenied && (
              <p className="text-[11px] font-bold text-amber-600 mt-4">متصفحك رفض طلب الموقع، اختار منطقتك يدوياً بدلاً من ذلك.</p>
            )}
          </div>
        ) : loadingData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton rounded-3xl h-72" />
            ))}
          </div>
        ) : displayedPharmacies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {displayedPharmacies.map((pharmacy) => (
              <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-3xl border border-gray-200">
            <p className="text-slate-500 text-sm font-extrabold">{PHARMACY_SECTIONS_META[activePharmacyTab as PharmacySectionKey]?.emptyLabel ?? 'غير متاح حالياً'}</p>
            <p className="text-slate-400 text-xs font-bold mt-2">رجّع لك في وقتٍ تاني، أو جرّب تصنيف تاني</p>
          </div>
        )}
      </section>
      </Reveal>

      {/* ==================== PHARMACIES MAP ==================== */}
      <PharmacyMap pharmacies={sortedPharmacies} loading={loadingData} />

      {/* ==================== FEATURED DISCOUNTED PRODUCTS ==================== */}
      {/* ==================== FEATURED PRODUCTS ==================== */}
      <Reveal><FeaturedProducts products={products} loading={loadingData} popularProductIds={popularProductIds} /></Reveal>

      {/* ==================== MOST SEARCHED ==================== */}
      <Reveal><MostSearched products={products} popularProductIds={popularProductIds} /></Reveal>

      {/* ==================== HOW IT WORKS ==================== */}
      <Reveal><HomeHowItWorks /></Reveal>

      {/* ==================== WHY US SECTION ==================== */}
      <Reveal>
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span
            className="text-xs font-extrabold px-3.5 py-1 rounded-full"
            style={{
              backgroundColor: `${themeColors.primaryColor}15`,
              color: themeColors.primaryColor
            }}
          >
            مميزات منصتنا
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">لماذا نعتبر اختيارك الأول؟</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <MapPin className="w-6 h-6" />, title: 'أقرب صيدلية', desc: 'نحدد موقعك ونعرض الصيدليات الأقرب إليك بالمسافة والوقت', color: themeColors.primaryColor },
            { icon: <Search className="w-6 h-6" />, title: 'بحث بالباركود والصوت', desc: 'امسح الباركود، صور الروشتة، أو ابحث بالاسم بالصوت بسهولة', color: themeColors.secondaryColor },
            { icon: <TrendingDown className="w-6 h-6" />, title: 'مقارنة وتوفير', desc: 'قارن الأسعار بين الصيدليات واستفد من العروض والتخفيضات', color: themeColors.accentColor },
            { icon: <Truck className="w-6 h-6" />, title: 'توصيل مباشر 24/7', desc: 'اطلب الدواء واستلمه فوراً لباب البيت بتغليف محكم وآمن', color: '#0d9488' },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:shadow-lg transition-all duration-300 group"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${feature.color}15`, color: feature.color }}
              >
                {feature.icon}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1.5">{feature.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
      </Reveal>

      {/* ==================== TESTIMONIALS ==================== */}
      <Reveal><HomeTestimonials /></Reveal>

      {/* ==================== HEALTH TIPS ==================== */}
      <Reveal><HomeHealthTips /></Reveal>

      {/* ==================== FAQ ==================== */}
      <Reveal><HomeFAQ /></Reveal>

      {/* ==================== CUSTOMER SERVICE ==================== */}
      <Reveal><CustomerServiceBanner /></Reveal>

      {/* ==================== EMERGENCY CTA BANNER ==================== */}
      {storeConfig.purchasesEnabled && (
      <Reveal>
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-[2rem] relative overflow-hidden text-center text-white"
          style={{
            background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})`,
            boxShadow: `0 20px 50px -15px ${themeColors.primaryColor}88`,
          }}
        >
          {/* Decorative pattern + glow orbs */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-20 w-80 h-80 rounded-full bg-black/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-12 sm:py-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-[11px] sm:text-xs font-bold mb-6 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5" fill="currentColor" />
              خدمة طوارئ دوائية على مدار الساعة
            </div>

            <div className="w-16 h-16 rounded-3xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-5 backdrop-blur-sm animate-float shadow-lg">
              <PhoneCall className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-3">
              مش لاقي دواك؟ احنا نجيبهولك!
            </h2>
            <p className="text-white/85 mb-8 max-w-xl mx-auto text-xs sm:text-sm font-bold leading-relaxed">
              فريق الصيدلية والمساعد الذكي جاهزون لإيجاد دوائك وتوصيله إليك أينما كنت
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setPrescriptionModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-900 font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <FileText className="w-4 h-4 text-slate-700" />
                صوّر روشتك الآن
              </button>
              <button
                onClick={() => setBarcodeModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg border border-white/40 bg-white/10 backdrop-blur-sm"
              >
                <Barcode className="w-4 h-4" />
                امسحلي صندوق الدواء
              </button>
              {settings.contact_whatsapp && (
                <a
                  href={`https://wa.me/${settings.contact_whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-black text-xs sm:text-sm hover:brightness-95 hover:scale-105 active:scale-95 transition-all shadow-md"
                  style={{ backgroundColor: `${themeColors.secondaryColor}cc` }}
                >
                  <Send className="w-4 h-4" />
                  تواصل واتساب
                </a>
              )}
            </div>
            <p className="text-[11px] text-white/70 font-bold flex items-center justify-center gap-1.5 mt-5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              تصوير الروشتة مجاني وسرّي — يراجعها صيدلي حقيقي قبل صرف أي دواء
            </p>
          </div>
        </div>
      </section>
      </Reveal>
      )}

      {/* MODALS */}
      <BarcodeScannerModal
        open={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        onScan={(code) => navigate({ name: 'search', query: code })}
      />
      <LocationSelectorModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={userLocationName}
        onSelectLocation={handleManualLocation}
      />
      <PrescriptionUploadModal
        open={prescriptionModalOpen}
        onClose={() => setPrescriptionModalOpen(false)}
      />
    </div>
  );
}
