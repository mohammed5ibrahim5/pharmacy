import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  MapPin,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Heart,
  ShieldCheck,
  PhoneCall,
  ShoppingBag,
  Send,
  Barcode,
  FileText,
  Mic,
  Zap,
  Calculator,
  Cross,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from '@/context/RouterContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { PharmacyCard } from '@/components/PharmacyCard';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { LocationSelectorModal } from '@/components/LocationSelectorModal';
import { PrescriptionUploadModal } from '@/components/PrescriptionUploadModal';
import { DoseCalculatorModal } from '@/components/DoseCalculatorModal';
import { getPharmacyWithDistance, sortPharmaciesByDistance } from '@/lib/distance';
import { findAreaLocation } from '@/lib/areaLocations';
import { trackSearch } from '@/lib/searchHistory';
import { buildWhatsAppLink } from '@/lib/whatsapp';
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
import { TrustSignals } from '@/components/TrustSignals';
import { categoryColor, categoryGradient, categoryIcon, mergeCategories, orderedCategories } from '@/lib/categoryStyles';
import { heroBadgeIcon } from '@/lib/heroBadges';
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

const HERO_TRENDING = [
  'بنادول اكسترا',
  'كونجستال',
  'أوميجا 3 بلس',
  'سي ريتارد',
  'أوجمنتين 1 جم',
  'سيتامول',
  'كمامات طبية',
];

type PharmacyTab = 'nearest' | 'favorite' | 'highest_rated' | 'most_popular' | 'delivery' | '24h';

export function HomePage() {
  const { settings, themeColors, heroConfig, storeConfig, homepageConfig, featuresConfig, headerConfig } = useSettings();
  const { t, lang, dir, p } = useLanguage();
  const { navigate } = useRouter();
  const { location, requestLocation, loading, permissionDenied, setUserLocation } = useGeolocation();
  const { favoritePharmacies } = useFavorites();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [popularProductIds, setPopularProductIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [heroScrollY, setHeroScrollY] = useState(0);

  const categoriesScrollRef = useRef<HTMLDivElement | null>(null);
  const categoriesWheelCleanupRef = useRef<(() => void) | null>(null);
  const [categoriesScroll, setCategoriesScroll] = useState({ scrollable: false, atStart: true, atEnd: false });
  const [categoriesProgress, setCategoriesProgress] = useState(0);
  const [categoriesHovered, setCategoriesHovered] = useState(false);

  const updateCategoriesScrollState = useCallback(() => {
    const el = categoriesScrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const scrollable = max > 4;
    const current = Math.abs(el.scrollLeft);
    setCategoriesScroll({
      scrollable,
      atStart: current <= 2,
      atEnd: max - current <= 2,
    });
    setCategoriesProgress(scrollable ? Math.min(100, Math.max(0, (current / max) * 100)) : 0);
  }, []);

  const scrollCategoriesToEdge = useCallback((edge: 'start' | 'end') => {
    const el = categoriesScrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) return;
    const isRTL = getComputedStyle(el).direction === 'rtl';
    const step = Math.min(360, Math.max(140, el.clientWidth * 0.8));
    const current = Math.abs(el.scrollLeft);
    const target = edge === 'end' ? Math.min(max, current + step) : Math.max(0, current - step);
    el.scrollTo({ left: (isRTL ? -1 : 1) * target, behavior: 'smooth' });
  }, []);

  const categoriesScrollRefCallback = useCallback((node: HTMLDivElement | null) => {
    categoriesScrollRef.current = node;
    if (categoriesWheelCleanupRef.current) {
      categoriesWheelCleanupRef.current();
      categoriesWheelCleanupRef.current = null;
    }
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      const max = node.scrollWidth - node.clientWidth;
      if (max <= 4) return;
      e.preventDefault();
      const dir = getComputedStyle(node).direction === 'rtl' ? -1 : 1;
      node.scrollLeft += dir * (e.deltaY + e.deltaX);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    categoriesWheelCleanupRef.current = () => node.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!categoriesHovered) return;
      const el = categoriesScrollRef.current;
      if (!el) return;
      const dir = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
      const step = Math.min(320, Math.max(120, el.clientWidth * 0.8));
      const move = (delta: number) => {
        e.preventDefault();
        el.scrollBy({ left: delta, behavior: 'smooth' });
      };
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(dir * step);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(-dir * step);
      else if (e.key === 'Home') move(-el.scrollLeft);
      else if (e.key === 'End') move(dir * (el.scrollWidth - el.clientWidth) - el.scrollLeft);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [categoriesHovered]);

  useEffect(() => {
    updateCategoriesScrollState();
  }, [loadingData, categories, updateCategoriesScrollState]);

  useEffect(() => {
    window.addEventListener('resize', updateCategoriesScrollState);
    return () => window.removeEventListener('resize', updateCategoriesScrollState);
  }, [updateCategoriesScrollState]);

  // Manual section membership from admin (pharmacy_sections)
  const [pharmacySections, setPharmacySections] = useState<Record<string, string[]>>({});
  const [sectionsLoaded, setSectionsLoaded] = useState(false);

  // Active Pharmacy Tab State
  const [activePharmacyTab, setActivePharmacyTab] = useState<PharmacyTab>('nearest');

  // Modals state
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [doseModalOpen, setDoseModalOpen] = useState(false);
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
    return localStorage.getItem('user_delivery_location') || '';
  });

  useEffect(() => {
    const onScroll = () => setHeroScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [pharmRes, prodRes, catRes, ordersRes, sectionsRes, catCountRes] = await Promise.all([
        supabase.from('pharmacies').select('*').eq('is_active', true),
        supabase.from('products').select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)').eq('is_available', true).limit(20),
        supabase.from('categories').select('*').order('name'),
        supabase.from('orders').select('pharmacy_id, product_id, status'),
        supabase.from('pharmacy_sections').select('pharmacy_id, section_key'),
        supabase.from('products').select('category_id').eq('is_available', true),
      ]);
      setPharmacies(pharmRes.data || []);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);

      const catCounts: Record<string, number> = {};
      (catCountRes.data || []).forEach((r: { category_id: string | null }) => {
        if (r.category_id) catCounts[r.category_id] = (catCounts[r.category_id] || 0) + 1;
      });
      setCategoryCounts(catCounts);

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

  const favoritePharmaciesList = useMemo(
    () => pharmacies.filter((p) => favoritePharmacies.includes(p.id)),
    [pharmacies, favoritePharmacies]
  );

  // Products whose pharmacy is in the customer's favorites show up first
  const featuredProducts = useMemo(() => {
    const favSet = new Set(favoritePharmacies);
    return [...products].sort((a, b) => {
      const af = a.for_all_pharmacies || (a.pharmacy_id ? favSet.has(a.pharmacy_id) : false) ? 0 : 1;
      const bf = b.for_all_pharmacies || (b.pharmacy_id ? favSet.has(b.pharmacy_id) : false) ? 0 : 1;
      return af - bf;
    });
  }, [products, favoritePharmacies]);

  const displayedPharmacies = useMemo(() => {
    switch (activePharmacyTab) {
      case 'nearest':
        return sortedPharmacies;
      case 'favorite':
        return favoritePharmaciesList;
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
    favoritePharmaciesList,
    highestRatedPharmacies,
    mostPopularPharmacies,
    deliveryPharmacies,
    pharmacies24h,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ name: 'search', query: searchQuery.trim() });
      try {
        trackSearch(searchQuery.trim());
      } catch {
        // tracking must never block the search
      }
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
      alert(t('البحث الصوتي غير مدعوم في هذا المتصفح.'));
    }
  };

  return (
    <div className="overflow-hidden bg-slate-50/60">
      {/* ==================== HERO SECTION ==================== */}
      <section
        className="relative overflow-hidden pt-10 sm:pt-16 pb-12 lg:pb-32 border-b transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${themeColors.heroBgStart}, ${themeColors.heroBgMiddle}, ${themeColors.heroBgEnd})`,
          borderColor: `${themeColors.primaryColor}15`
        }}
      >
        {/* Glow Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-40 -end-40 w-[600px] h-[600px] rounded-full opacity-20 blur-[130px] animate-pulse"
            style={{ backgroundColor: themeColors.primaryColor }}
          />
          <div
            className="absolute top-1/2 -start-40 w-[500px] h-[500px] rounded-full opacity-15 blur-[110px] animate-float"
            style={{ backgroundColor: themeColors.secondaryColor }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.04)_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-20" />
          {/* Floating Medical Emojis */}
          <div className="absolute top-[15%] start-[8%] text-4xl opacity-20 animate-float hidden lg:block" style={{ animationDelay: '0s' }}>💊</div>
          <div className="absolute top-[30%] end-[10%] text-3xl opacity-15 animate-float hidden lg:block" style={{ animationDelay: '1.5s' }}>🩺</div>
          <div className="absolute bottom-[25%] start-[15%] text-3xl opacity-15 animate-float-slow hidden lg:block" style={{ animationDelay: '0.8s' }}>🏥</div>
          <div className="absolute top-[60%] end-[6%] text-2xl opacity-10 animate-float hidden lg:block" style={{ animationDelay: '2.2s' }}>💉</div>
          <div className="absolute top-[10%] end-[25%] text-2xl opacity-10 animate-float-slow hidden xl:block" style={{ animationDelay: '3s' }}>🧬</div>

          {/* Floating Trust Badges — parallax with scroll */}
          {(() => {
            const badges = homepageConfig.heroBadges.badges.filter((b) => b.enabled);
            if (!homepageConfig.heroBadges.showBadges || badges.length === 0) return null;
            const spots = [
              { cls: 'top-[13%] start-[5%]', delay: '0s', speed: 0.22 },
              { cls: 'top-[26%] end-[6%]', delay: '1.2s', speed: 0.3 },
              { cls: 'bottom-[20%] start-[8%]', delay: '0.6s', speed: 0.16 },
              { cls: 'bottom-[26%] end-[5%]', delay: '1.8s', speed: 0.26 },
            ];
            return spots.slice(0, badges.length).map((spot, i) => {
              const badge = badges[i];
              const BadgeIcon = heroBadgeIcon(badge.icon);
              return (
                <div key={badge.id} className={`absolute ${spot.cls} hidden lg:block`} style={{ transform: `translateY(${(heroScrollY * spot.speed).toFixed(1)}px)` }}>
                  <div className="flex items-center gap-2.5 rounded-full px-4 py-2.5 backdrop-blur-md shadow-xl border animate-float" style={{ animationDelay: spot.delay, backgroundColor: `${themeColors.headerBg}e6`, borderColor: `${badge.color}45` }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${badge.color}22`, color: badge.color }}>
                      <BadgeIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-[11px] font-black whitespace-nowrap" style={{ color: themeColors.heroText }}>{p(badge.title, badge.title_en)}</p>
                      <p className="text-[9px] font-bold whitespace-nowrap" style={{ color: badge.color }}>{p(badge.subtitle, badge.subtitle_en)}</p>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
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
              <span>{t('المنصة الأولى للبحث عن الأدوية والصيدليات القريبة')}</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.2] tracking-tight animate-fade-up" style={{ color: themeColors.heroText, animationDelay: '0.1s' }}>
              <span className="text-transparent bg-clip-text bg-gradient-to-l" style={{ backgroundImage: `linear-gradient(to left, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}>
                {p(settings.hero_title || 'اعثر على دوائك في أقرب صيدلية', settings.hero_title_en)}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed font-bold animate-fade-up opacity-80" style={{ color: themeColors.heroText, animationDelay: '0.2s' }}>
              {p(settings.hero_subtitle || 'ابحث عن الأدوية والمستلزمات الطبية، قارن الأقرب إليك، واطلب التوصيل المباشر لباب المنزل على مدار الساعة.', settings.hero_subtitle_en)}
            </p>

            {/* MAIN SEARCH FORM */}
            {heroConfig.showSearch && (
            <div className="pt-2 animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <div
                  className="relative flex items-center rounded-3xl shadow-xl border-2 p-2 transition-all group bg-white"
                  style={{ borderColor: `${themeColors.primaryColor}33` }}
                >
                  <div className="flex items-center gap-1 sm:gap-2 ps-2 sm:ps-3 pe-1 sm:pe-2 border-s border-gray-200 shrink-0">
                    <button
                      type="button"
                      onClick={handleVoiceSearch}
                      className={`p-1.5 sm:p-2 rounded-xl text-gray-400 hover:bg-teal-50 transition-colors ${
                        isListening ? 'text-red-500 animate-bounce' : ''
                      }`}
                      style={{ color: isListening ? '#ef4444' : themeColors.accent2Color }}
                      title={t('بحث بالصوت')}
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
                      title={t('مسح باركود وتصوير الدواء')}
                    >
                      <Barcode className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('باركود')}</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={p(heroConfig.searchPlaceholder, heroConfig.searchPlaceholder_en)}
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
                    <span className="hidden sm:inline">{t('بحث')}</span>
                  </button>
                </div>
              </form>

              {heroConfig.showTrending && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs font-bold">
                <span className="opacity-60 font-bold flex items-center gap-1" style={{ color: themeColors.heroText }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: themeColors.accentColor }} />
                  {p(heroConfig.trendingLabel, heroConfig.trendingLabel_en)}
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
                    {t(item)}
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
                <span className="truncate">{p(heroConfig.prescriptionButtonText, heroConfig.prescriptionButtonText_en)}</span>
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
                  <span className="truncate">{loading ? t('جاري تحديد موقعك...') : permissionDenied ? t('حدد الموقع يدوياً') : p(heroConfig.locationButtonText, heroConfig.locationButtonText_en)}</span>
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
                  <span className="truncate">{p(heroConfig.locationSetText, heroConfig.locationSetText_en)}</span>
                </button>
              )}
              </>
              )}
            </div>

            {heroConfig.showPrescriptionButton && (
              <p className="text-[11px] font-bold opacity-70 flex items-center justify-center gap-1.5 animate-fade-up" style={{ color: themeColors.heroText, animationDelay: '0.45s' }}>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.primaryColor }} />
                {t('صوّر الروشتة من هاتفك — يراجعها صيدلي حقيقي مرخّص قبل صرف أي دواء')}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ==================== CATEGORIES SECTION ==================== */}
      <Reveal>
      <section className="relative overflow-hidden py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold mb-2"
                style={{
                  backgroundColor: `${themeColors.primaryColor}12`,
                  color: themeColors.primaryColor,
                  border: `1px solid ${themeColors.primaryColor}26`,
                }}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {t('تصفح الأقسام الطبية')}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('تسوق حسب الفئة')}</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-bold">{t('اختر القسم اللي يناسب احتياجك وابدأ التسوق')}</p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => navigate({ name: 'categories' })}
                className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold text-white transition-all duration-300 hover:brightness-110"
                style={{
                  backgroundColor: themeColors.primaryColor,
                  boxShadow: `0 10px 20px -10px ${themeColors.primaryColor}cc`,
                }}
              >
                <span>{t('عرض جميع الأقسام')}</span>
                {dir === 'ltr' ? (
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                )}
              </button>
            </div>
          </div>

          {/* Categories strip */}
          {loadingData && categories.length === 0 ? (
            <div className="flex gap-2.5 overflow-hidden">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="skeleton rounded-2xl w-[130px] sm:w-[140px] h-[118px] shrink-0" />
              ))}
            </div>
          ) : (
          <div className="relative">
            <div
              ref={categoriesScrollRefCallback}
              onScroll={updateCategoriesScrollState}
              onMouseEnter={() => setCategoriesHovered(true)}
              onMouseLeave={() => setCategoriesHovered(false)}
              className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
              style={{
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {orderedCategories(mergeCategories(categories)).map((cat) => {
                const color = categoryColor(cat.slug);
                const gradient = categoryGradient(cat.slug);
                const Icon = categoryIcon(cat.slug, cat.icon);
                const count = categoryCounts[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => navigate({ name: 'category', slug: cat.slug })}
                    className="group relative flex flex-col items-center justify-center shrink-0 w-[130px] sm:w-[140px] min-h-[118px] rounded-2xl text-white text-center overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95"
                    style={{
                      background: gradient,
                      boxShadow: `0 10px 22px -14px ${color}dd`,
                      scrollSnapAlign: 'start',
                    }}
                  >
                    <span className="absolute -end-6 -top-6 w-20 h-20 rounded-full bg-white/15 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                    <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-white/0 via-white/60 to-white/0 opacity-60 pointer-events-none" />

                    <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 backdrop-blur-sm flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="mt-2 w-full px-2 text-[11px] font-extrabold leading-tight line-clamp-1 drop-shadow-sm">
                      {lang === 'en' ? (cat.name_en || t(cat.name)) : cat.name}
                    </h3>
                    <span className="mt-1 text-[9px] font-bold text-white/80 whitespace-nowrap">
                      {count > 0 ? t('{0} منتج', [count]) : t('متوفر الآن')}
                    </span>
                  </button>
                );
              })}
            </div>

            {categoriesScroll.scrollable && (
              <>
                <button
                  type="button"
                  onClick={() => scrollCategoriesToEdge('start')}
                  disabled={categoriesScroll.atStart}
                  aria-label={t('تحريك الفئات للبداية')}
                  className="absolute top-1/2 -translate-y-1/2 start-1 z-10 flex items-center justify-center w-9 h-9 rounded-full border backdrop-blur-md transition-all duration-300 disabled:opacity-0 disabled:cursor-default enabled:hover:scale-105 enabled:active:scale-90 enabled:hover:shadow-lg"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    borderColor: 'rgba(15,23,42,0.12)',
                    color: themeColors.primaryColor,
                    boxShadow: '0 6px 16px -8px rgba(15,23,42,0.35)',
                  }}
                >
                  {dir === 'ltr' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategoriesToEdge('end')}
                  disabled={categoriesScroll.atEnd}
                  aria-label={t('تحريك الفئات للنهاية')}
                  className="absolute top-1/2 -translate-y-1/2 end-1 z-10 flex items-center justify-center w-9 h-9 rounded-full border backdrop-blur-md transition-all duration-300 disabled:opacity-0 disabled:cursor-default enabled:hover:scale-105 enabled:active:scale-90 enabled:hover:shadow-lg"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    borderColor: 'rgba(15,23,42,0.12)',
                    color: themeColors.primaryColor,
                    boxShadow: '0 6px 16px -8px rgba(15,23,42,0.35)',
                  }}
                >
                  {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </>
            )}

            {/* Scroll progress indicator */}
            {categoriesScroll.scrollable && (
              <div className="flex items-center gap-3 mt-3.5 max-w-xs mx-auto">
                <span className="h-1 flex-1 rounded-full bg-slate-200/80 overflow-hidden">
                  <span
                    className="block h-full rounded-full transition-[width] duration-200 ease-out"
                    style={{
                      width: `${categoriesProgress}%`,
                      background: `linear-gradient(90deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})`,
                    }}
                  />
                </span>
              </div>
            )}
          </div>
          )}
        </div>
      </section>
      </Reveal>

      {/* ==================== PHARMACIES ==================== */}
      <Reveal>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {p(homepageConfig.pharmaciesTitle, homepageConfig.pharmaciesTitle_en)}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 font-bold">
              {p(homepageConfig.pharmaciesSubtitle, homepageConfig.pharmaciesSubtitle_en)}
            </p>
          </div>
          <span
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-gray-200 text-xs font-extrabold text-slate-700 shadow-sm self-start sm:self-auto"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColors.primaryColor }} />
            {t('{0} صيدلية معتمدة', [pharmacies.length])}
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-none">
          {[
            { id: 'favorite', label: 'صيدلياتي المفضلة' },
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
                {t(tab.label)}
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
            <h3 className="text-lg font-black text-slate-900 mb-1.5">{t('حدّد موقعك لعرض أقرب الصيدليات')}</h3>
            <p className="text-sm text-slate-500 font-bold mb-6 max-w-md mx-auto leading-relaxed">
              {t('عشان نشوفلك أقرب صيدلية لجوّاك، حدد موقعك الحالي أو اختر منطقتك يدوياً.')}
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
                {loading ? t('جاري تحديد موقعك...') : t('تحديد موقعي الآن')}
              </button>
              <button
                onClick={() => setLocationModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border-2 text-xs font-black transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                style={{ color: themeColors.primaryColor, borderColor: `${themeColors.primaryColor}40` }}
              >
                <MapPin className="w-4 h-4" />
                {t('اختيار المنطقة يدوياً')}
              </button>
            </div>
            {permissionDenied && (
              <p className="text-[11px] font-bold text-amber-600 mt-4">{t('متصفحك رفض طلب الموقع، اختار منطقتك يدوياً بدلاً من ذلك.')}</p>
            )}
          </div>
        ) : loadingData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton rounded-3xl h-72" />
            ))}
          </div>
        ) : activePharmacyTab === 'favorite' && displayedPharmacies.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-gray-200 animate-fade-in">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#fdf2f8' }}
            >
              <Heart className="w-8 h-8 text-pink-500" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1.5">{t('لا توجد صيدليات مفضلة بعد')}</h3>
            <p className="text-sm text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
              {t('اضغط على علامة القلب ♥ بجانب أي صيدلية لإضافتها إلى مفضلتك هنا.')}
            </p>
          </div>
        ) : displayedPharmacies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {displayedPharmacies.map((pharmacy) => (
              <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-3xl border border-gray-200">
            <p className="text-slate-500 text-sm font-extrabold">{t(PHARMACY_SECTIONS_META[activePharmacyTab as PharmacySectionKey]?.emptyLabel ?? 'غير متاح حالياً')}</p>
            <p className="text-slate-400 text-xs font-bold mt-2">{t('رجّع لك في وقتٍ تاني، أو جرّب تصنيف تاني')}</p>
          </div>
        )}
      </section>
      </Reveal>

      {/* ==================== PHARMACIES MAP ==================== */}
      <div className="hidden lg:block"><PharmacyMap pharmacies={sortedPharmacies} loading={loadingData} /></div>

      {/* ==================== FEATURED PRODUCTS ==================== */}
      <Reveal><FeaturedProducts products={featuredProducts} loading={loadingData} popularProductIds={popularProductIds} /></Reveal>

      {/* ==================== MOST SEARCHED ==================== */}
      <Reveal className="hidden lg:block"><MostSearched products={featuredProducts} popularProductIds={popularProductIds} /></Reveal>

      {/* ==================== HOW IT WORKS ==================== */}
      <Reveal className="hidden lg:block"><HomeHowItWorks /></Reveal>

      {/* ==================== ABOUT ==================== */}
      {(settings.about_title || settings.about_text) && (
      <Reveal className="hidden lg:block">
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
          <div className="lg:col-span-2">
            <span
              className="text-xs font-extrabold px-3.5 py-1 rounded-full"
              style={{ backgroundColor: `${themeColors.primaryColor}15`, color: themeColors.primaryColor }}
            >
              {t('من نحن')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {p(settings.about_title || 'من نحن', settings.about_title_en)}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium mt-4 whitespace-pre-line">
              {p(settings.about_text || '', settings.about_text_en)}
            </p>
          </div>
          <div
            className="rounded-3xl p-8 flex items-center justify-center"
            style={{ backgroundColor: `${themeColors.primaryColor}10` }}
          >
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
              style={{ backgroundColor: themeColors.primaryColor }}
            >
              <Cross className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </section>
      </Reveal>
      )}

      {/* ==================== TRUST SIGNALS ==================== */}
      <Reveal><TrustSignals /></Reveal>

      {/* ==================== TESTIMONIALS ==================== */}
      <Reveal><HomeTestimonials /></Reveal>

      {/* ==================== HEALTH TIPS ==================== */}
      <Reveal className="hidden lg:block"><HomeHealthTips /></Reveal>

      {/* ==================== FAQ ==================== */}
      <Reveal><HomeFAQ /></Reveal>

      {/* ==================== CUSTOMER SERVICE ==================== */}
      <Reveal className="hidden lg:block"><CustomerServiceBanner /></Reveal>

      {/* ==================== EMERGENCY CTA BANNER ==================== */}
      {storeConfig.purchasesEnabled && (
      <Reveal className="hidden lg:block">
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
          <div className="absolute -top-24 -start-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -end-20 w-80 h-80 rounded-full bg-black/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-12 sm:py-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-[11px] sm:text-xs font-bold mb-6 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5" fill="currentColor" />
              {t('خدمة طوارئ دوائية على مدار الساعة')}
            </div>

            <div className="w-16 h-16 rounded-3xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-5 backdrop-blur-sm animate-float shadow-lg">
              <PhoneCall className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-3">
              {t('مش لاقي دواك؟ احنا نجيبهولك!')}
            </h2>
            <p className="text-white/85 mb-8 max-w-xl mx-auto text-xs sm:text-sm font-bold leading-relaxed">
              {t('فريق الصيدلية والمساعد الذكي جاهزون لإيجاد دوائك وتوصيله إليك أينما كنت')}
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setPrescriptionModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-900 font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <FileText className="w-4 h-4 text-slate-700" />
                {t('صوّر روشتك الآن')}
              </button>
              <button
                onClick={() => setBarcodeModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg border border-white/40 bg-white/10 backdrop-blur-sm"
              >
                <Barcode className="w-4 h-4" />
                {t('امسحلي صندوق الدواء')}
              </button>
              {featuresConfig.doseCalculator && (
                <button
                  onClick={() => setDoseModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg border border-white/40 bg-white/10 backdrop-blur-sm"
                >
                  <Calculator className="w-4 h-4" />
                  {t('حاسبة جرعات الأطفال')}
                </button>
              )}
              {settings.contact_whatsapp && (
                <a
                  href={buildWhatsAppLink(settings.contact_whatsapp, t('مرحباً، أحتاج مساعدة من صيدليتي'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-black text-xs sm:text-sm hover:brightness-95 hover:scale-105 active:scale-95 transition-all shadow-md"
                  style={{ backgroundColor: `${themeColors.secondaryColor}cc` }}
                >
                  <Send className="w-4 h-4" />
                  {t('تواصل واتساب')}
                </a>
              )}
            </div>
            <p className="text-[11px] text-white/70 font-bold flex items-center justify-center gap-1.5 mt-5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              {t('تصوير الروشتة مجاني وسرّي — يراجعها صيدلي حقيقي قبل صرف أي دواء')}
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
        currentLocation={userLocationName || headerConfig.locationText || t('القاهرة - المعادي')}
        onSelectLocation={handleManualLocation}
      />
      <PrescriptionUploadModal
        open={prescriptionModalOpen}
        onClose={() => setPrescriptionModalOpen(false)}
      />
      {featuresConfig.doseCalculator && doseModalOpen && (
        <DoseCalculatorModal onClose={() => setDoseModalOpen(false)} />
      )}
    </div>
  );
}
