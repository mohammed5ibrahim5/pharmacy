import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Menu,
  X,
  Cross,
  Send,
  MapPin,
  Barcode,
  FileText,
  Mic,
  ChevronDown,
  Pill,
  Zap,
  Flame,
  LayoutGrid,
  ArrowUpLeft,
  ShoppingCart,
  Moon,
  Sun,
  Languages,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCustomer } from '@/context/CustomerContext';
import { UserMenu } from '@/components/UserMenu';
import { NotificationsBell } from '@/components/NotificationsBell';
import { AuthModal } from '@/components/AuthModal';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { LocationSelectorModal } from '@/components/LocationSelectorModal';
import { PrescriptionUploadModal } from '@/components/PrescriptionUploadModal';
import { useOrder } from '@/context/OrderContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/lib/supabase';
import { trackSearch } from '@/lib/searchHistory';
import { smartSearch } from '@/lib/search';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { categoryColor, categoryIcon, mergeCategories } from '@/lib/categoryStyles';
import type { Product, Category } from '@/types';

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

const UNIFIED_TRENDING = [
  'بنادول اكسترا',
  'كونجستال',
  'أوميجا 3 بلس',
  'سي ريتارد',
  'أوجمنتين 1 جم',
  'سيتامول',
  'كمامات طبية',
];

const TRENDING_LIMIT = 7;

export function Header() {
  const { navigate, route } = useRouter();
  const { settings, themeColors, headerConfig, storeConfig, darkMode, toggleDarkMode } = useSettings();
  const { t, p, lang, toggleLang } = useLanguage();
  const { authModalOpen, setAuthModalOpen } = useCustomer();
  const { cartCount, openCart } = useOrder();
  const { setUserLocation: setGeoLocation } = useGeolocation();

  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [autoTrending, setAutoTrending] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<string>(() => {
    return localStorage.getItem('user_delivery_location') || '';
  });
  const displayLocation = userLocation || p(headerConfig.locationText, headerConfig.locationText_en) || t('القاهرة - المعادي');

  useEffect(() => {
    if (route.name === 'search') {
      setSearchQuery(route.query);
      setShowSuggestions(false);
    }
  }, [route]);

  useEffect(() => {
    if (headerConfig.trendingMode !== 'auto') return;
    let cancelled = false;
    const loadAutoTrending = async () => {
      const { data } = await supabase
        .from('search_keywords')
        .select('keyword')
        .order('search_count', { ascending: false })
        .limit(TRENDING_LIMIT);
      if (!cancelled && data && data.length > 0) {
        setAutoTrending(data.map((r: { keyword: string }) => r.keyword));
      }
    };
    loadAutoTrending();
    return () => {
      cancelled = true;
    };
  }, [headerConfig.trendingMode]);

  const trendingTags =
    headerConfig.trendingMode === 'auto'
      ? (autoTrending.length > 0 ? autoTrending : headerConfig.trendingKeywords)
      : (headerConfig.trendingKeywords.length > 0 ? headerConfig.trendingKeywords : UNIFIED_TRENDING);
  const [cartBump, setCartBump] = useState(false);
  const firstCartRender = useRef(true);

  useEffect(() => {
    if (firstCartRender.current) {
      firstCartRender.current = false;
      return;
    }
    if (cartCount <= 0) return;
    setCartBump(true);
    const t = window.setTimeout(() => setCartBump(false), 550);
    return () => window.clearTimeout(t);
  }, [cartCount]);

  const searchRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);
  const catWheelCleanupRef = useRef<(() => void) | null>(null);
  const [catScroll, setCatScroll] = useState({ visible: false, atStart: true, atEnd: false });
  const [catHovered, setCatHovered] = useState(false);

  const updateCatScroll = useCallback(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) {
      setCatScroll({ visible: false, atStart: true, atEnd: false });
      return;
    }
    const current = Math.abs(el.scrollLeft);
    setCatScroll({ visible: true, atStart: current <= 2, atEnd: max - current <= 2 });
  }, []);

  const scrollCatTo = useCallback((dir: 'start' | 'end') => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) return;
    const step = Math.min(400, Math.max(120, el.clientWidth * 0.8));
    const isRTL = getComputedStyle(el).direction === 'rtl';
    const target = dir === 'end' ? Math.min(max, Math.abs(el.scrollLeft) + step) : Math.max(0, Math.abs(el.scrollLeft) - step);
    el.scrollTo({ left: (isRTL ? -1 : 1) * target, behavior: 'smooth' });
  }, []);

  const categoryScrollRefCallback = useCallback((node: HTMLDivElement | null) => {
    categoryScrollRef.current = node;
    if (catWheelCleanupRef.current) {
      catWheelCleanupRef.current();
      catWheelCleanupRef.current = null;
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
    catWheelCleanupRef.current = () => node.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!catHovered) return;
      const el = categoryScrollRef.current;
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
  }, [catHovered]);

  useEffect(() => {
    updateCatScroll();
    window.addEventListener('resize', updateCatScroll);
    return () => window.removeEventListener('resize', updateCatScroll);
  }, [updateCatScroll, categories.length]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error || !data || data.length === 0) {
        const fallback = await supabase.from('categories').select('*').order('name', { ascending: true });
        if (fallback.data && fallback.data.length > 0) setCategories(fallback.data as Category[]);
      } else if (data.length > 0) {
        setCategories(data as Category[]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const fetchSuggestions = async () => {
        try {
          const term = searchQuery.trim();
          const pattern = `%${term}%`;
          const { data } = await supabase
            .from('products')
            .select('*, pharmacy:pharmacies(*)')
            .or(`name.ilike.${pattern},name_en.ilike.${pattern},active_ingredient.ilike.${pattern},description.ilike.${pattern}`)
            .eq('is_available', true)
            .limit(20);
          if (!data) return;
          // Smart ranking: brand name, scientific (active ingredient), typo tolerance
          const ranked = smartSearch(term, { products: data as Product[], onlyAvailable: true })
            .slice(0, 6)
            .map((r) => r.product);
          setSuggestions(ranked as Product[]);
          setShowSuggestions(true);
        } catch {
          // fallback: keep current suggestions
        }
      };
      const timeout = setTimeout(fetchSuggestions, 250);
      return () => clearTimeout(timeout);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (e?: React.FormEvent, term?: string) => {
    if (e) e.preventDefault();
    const queryToUse = term || searchQuery;
    if (queryToUse.trim()) {
      navigate({ name: 'search', query: queryToUse.trim() });
      try {
        trackSearch(queryToUse.trim());
      } catch {
        // tracking must never block the search
      }
      setShowSuggestions(false);
      setMenuOpen(false);
    }
  };

  const handleBarcodeScanResult = (scannedValue: string) => {
    setSearchQuery(scannedValue);
    handleSearchSubmit(undefined, scannedValue);
  };

  const handleLocationChange = (newLoc: string, coords?: { latitude: number; longitude: number }) => {
    setUserLocation(newLoc);
    localStorage.setItem('user_delivery_location', newLoc);
    if (coords) {
      setGeoLocation(coords.latitude, coords.longitude);
      sessionStorage.setItem('pharmacy_location_set', '1');
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
        handleSearchSubmit(undefined, transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      alert(t('البحث الصوتي غير مدعوم في متصفحك الحالي.'));
    }
  };

  return (
    <>
      <div className="sticky top-0 z-50">
      {/* 2. MAIN HEADER BAR */}
      <header
        className="relative z-40 border-b shadow-sm transition-all duration-300 backdrop-blur-xl"
        style={{
          backgroundColor: `${themeColors.headerBg}f2`,
          color: themeColors.headerText,
          borderColor: `${themeColors.headerText}15`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-5 py-2.5 lg:py-3">
            {/* Logo */}
            <button
              onClick={() => navigate({ name: 'home' })}
              className="flex items-center gap-2 sm:gap-3 shrink-0 group text-start min-w-0"
            >
              <div
                className="relative w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-[1.1rem] flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-[1.06] group-hover:-rotate-2 shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor || themeColors.primaryColor})`,
                  boxShadow: `0 8px 22px -6px ${themeColors.primaryColor}70`,
                }}
              >
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt={settings.site_name} className="w-full h-full object-cover" />
                ) : (
                  <Cross className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
                )}
                <span
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse"
                  style={{
                    backgroundColor: themeColors.accentColor,
                    boxShadow: `0 0 0 2px ${themeColors.headerBg}`,
                  }}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl font-black leading-tight truncate tracking-tight" style={{ color: themeColors.headerText }}>
                  {p(settings.site_name, settings.site_name_en)}
                </h1>
                <p className="text-[9px] sm:text-[11px] font-extrabold hidden sm:block tracking-widest uppercase opacity-70" style={{ color: themeColors.primaryColor }}>
                  {p(settings.site_tagline, settings.site_tagline_en)}
                </p>
              </div>
            </button>

            {/* SEARCH HUB - Desktop */}
            <div className="hidden md:flex flex-1 max-w-2xl flex-col relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="w-full relative group">
                <div
                  className="relative flex items-center h-11 lg:h-12 rounded-full border backdrop-blur-md transition-all duration-300 focus-within:shadow-lg focus-within:border-opacity-40"
                  style={{
                    backgroundColor: themeColors.headerSearchBg,
                    borderColor: `${themeColors.headerText}1f`,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                    placeholder={t('ابحث باسم الدواء، المادة الفعالة، أو امسح الباركود...')}
                    className="w-full pr-12 pl-28 py-2.5 bg-transparent text-xs sm:text-sm font-bold placeholder:font-medium focus:outline-none text-ellipsis"
                    style={{ color: themeColors.headerSearchText }}
                  />

                  <button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor || themeColors.primaryColor})`,
                      boxShadow: `0 4px 14px -3px ${themeColors.primaryColor}80`
                    }}
                    title={t('بحث')}
                  >
                    <Search className="w-4 h-4" strokeWidth={2.5} />
                  </button>

                  <div
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
                  >
                    {headerConfig.showVoiceSearch && (
                      <button
                        type="button"
                        onClick={handleVoiceSearch}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 ${
                          isListening ? 'text-red-500 animate-bounce' : ''
                        }`}
                        style={{
                          backgroundColor: isListening ? '#ef44441a' : `${themeColors.headerText}08`,
                          color: isListening ? '#ef4444' : themeColors.accent2Color
                        }}
                        title={t('بحث بالصوت')}
                      >
                        <Mic className="w-[15px] h-[15px]" />
                      </button>
                    )}

                    {headerConfig.showBarcode && (
                      <button
                        type="button"
                        onClick={() => setBarcodeModalOpen(true)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                          backgroundColor: `${themeColors.accent2Color}14`,
                          color: themeColors.accent2Color
                        }}
                        title={t('ماسح باركود وتصوير المنتج')}
                      >
                        <Barcode className="w-[17px] h-[17px]" />
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {/* TRENDING — نص أنيق تحت البحث مباشرة */}
              {headerConfig.showTrendingTags && (
                <div className="hidden lg:flex items-center gap-1 mt-1.5 px-1 text-[11px] overflow-x-auto scrollbar-none">
                  <span
                    className="flex items-center gap-1 font-black shrink-0"
                    style={{ color: themeColors.accentColor }}
                  >
                    <Flame className="w-3 h-3" fill="currentColor" />
                    {t('الأكثر طلباً:')}
                  </span>
                  {trendingTags.map((tag, i) => (
                    <span key={tag} className="flex items-center shrink-0">
                      <button
                        onClick={() => {
                          setSearchQuery(tag);
                          handleSearchSubmit(undefined, tag);
                        }}
                        className={`whitespace-nowrap font-bold transition-all hover:underline underline-offset-4 ${i === 0 ? 'ms-1.5' : ''}`}
                        style={{ color: themeColors.headerText, textDecorationColor: themeColors.primaryColor }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = themeColors.primaryColor)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = themeColors.headerText)}
                      >
                        {t(tag)}
                      </button>
                      {i < trendingTags.length - 1 && (
                        <span className="mx-2 opacity-25 select-none" style={{ color: themeColors.headerText }}>·</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* LIVE SUGGESTIONS DROPDOWN */}
              {showSuggestions && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-fade-in"
                  style={{
                    backgroundColor: themeColors.headerBg,
                    borderColor: `${themeColors.headerText}15`
                  }}
                >
                  <div
                    className="p-3 border-b flex items-center justify-between text-xs font-bold opacity-80"
                    style={{
                      backgroundColor: `${themeColors.headerText}05`,
                      color: themeColors.headerText,
                      borderColor: `${themeColors.headerText}10`
                    }}
                  >
                    <span>{t('نتائج وتلميحات البحث الحية:')}</span>
                    <span className="text-[10px] font-bold" style={{ color: themeColors.primaryColor }}>{t('اضغط للانتقال')}</span>
                  </div>
                  {suggestions.length > 0 ? (
<div className="divide-y max-h-72 overflow-y-auto">
                      {suggestions.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            navigate({ name: 'search', query: product.name });
                            setShowSuggestions(false);
                          }}
                          className="w-full p-3 flex items-center gap-3 transition-colors text-start group hover:bg-black/[0.03]"
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-10 h-10 rounded-xl object-cover border bg-white"
                              style={{ borderColor: `${themeColors.headerText}15` }}
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs"
                              style={{
                                backgroundColor: `${themeColors.primaryColor}15`,
                                color: themeColors.primaryColor
                              }}
                            >
                              <Pill className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold truncate group-hover:opacity-80" style={{ color: themeColors.headerText }}>
                              {lang === 'en' ? (product.name_en || product.name) : product.name}
                            </p>
                            {product.pharmacy && (
                              <p className="text-[10px] opacity-60 truncate" style={{ color: themeColors.headerText }}>
                                {t('صيدلية: {0}', [lang === 'en' ? (product.pharmacy.name_en || product.pharmacy.name) : product.pharmacy.name])}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-black" style={{ color: themeColors.primaryColor }}>
                            {t('{0} ج.م', [product.price])}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs opacity-60 space-y-1" style={{ color: themeColors.headerText }}>
                      <p>{t('اضغط إنتر أو زِر البحث لعرض جميع الأدوية المطابقة لـ "{0}"', [searchQuery])}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT HEADER ACTIONS */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {headerConfig.showBarcode && (
                <button
                  onClick={() => setBarcodeModalOpen(true)}
                  className="sm:hidden w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:scale-90"
                  style={{
                    backgroundColor: `${themeColors.headerText}08`,
                    color: themeColors.headerText,
                    borderColor: `${themeColors.headerText}14`
                  }}
                  title={t('مسح باركود')}
                >
                  <Barcode className="w-[19px] h-[19px]" strokeWidth={2.25} />
                </button>
              )}

              {headerConfig.showVoiceSearch && (
                <button
                  onClick={handleVoiceSearch}
                  className={`md:hidden w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:scale-90 ${
                    isListening ? 'text-red-500 animate-bounce' : ''
                  }`}
                  style={{
                    backgroundColor: isListening ? '#ef44441a' : `${themeColors.headerText}08`,
                    color: isListening ? '#ef4444' : themeColors.headerText,
                    borderColor: isListening ? '#ef44444d' : `${themeColors.headerText}14`
                  }}
                  title={t('بحث بالصوت')}
                >
                  <Mic className="w-[19px] h-[19px]" strokeWidth={2.25} />
                </button>
              )}

              {/* الوضع الليلي — زر سريع */}
              <button
                onClick={toggleDarkMode}
                className="hidden md:flex relative w-10 h-10 rounded-full items-center justify-center border transition-all duration-200 hover:-translate-y-0.5 active:scale-90 overflow-hidden shrink-0"
                style={{
                  backgroundColor: `${themeColors.headerText}08`,
                  color: themeColors.headerText,
                  borderColor: `${themeColors.headerText}14`
                }}                title={darkMode ? t('الوضع الفاتح') : t('الوضع الليلي')}
                aria-label={darkMode ? t('الوضع الفاتح') : t('الوضع الليلي')}
              >
                <Sun className={`w-[19px] h-[19px] transition-all duration-300 ${darkMode ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} strokeWidth={2.25} />
                <Moon className={`absolute inset-0 m-auto w-[19px] h-[19px] transition-all duration-300 ${darkMode ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} strokeWidth={2.25} />
              </button>

              <NotificationsBell />

              <button
                onClick={() => openCart('cart')}
                className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:scale-90 ${cartBump ? 'animate-cart-bump' : ''}`}
                style={{
                  backgroundColor: `${themeColors.headerText}08`,
                  color: themeColors.headerText,
                  borderColor: `${themeColors.headerText}14`
                }}
                title={t('سلة التسوق')}
                aria-label={t('سلة التسوق')}
              >
                <ShoppingCart className="w-[19px] h-[19px]" strokeWidth={2.25} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center ring-2"
                    style={{ backgroundColor: themeColors.priceColor, '--tw-ring-color': themeColors.headerBg } as React.CSSProperties}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>

              <UserMenu />

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90"
                style={{
                  backgroundColor: `${themeColors.headerText}08`,
                  color: themeColors.headerText,
                  borderColor: `${themeColors.headerText}14`
                }}
                aria-label={t('القائمة')}
              >
                {menuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>
        </div>

        {/* 3. CATEGORY QUICK NAVIGATION BAR — desktop only; mobile uses the home categories section */}
        {headerConfig.showCategoryPills && (
          <div
            className="hidden lg:block border-b shadow-sm transition-all duration-300"
            style={{
              backgroundColor: themeColors.headerNavBg,
              color: themeColors.headerNavText,
              borderColor: `${themeColors.headerNavText}15`
            }}
          >
            <div className="relative">
              <div
                ref={categoryScrollRefCallback}
                onScroll={updateCatScroll}
                onMouseEnter={() => setCatHovered(true)}
                onMouseLeave={() => setCatHovered(false)}
                className="overflow-x-auto scrollbar-none"
                style={
                  catScroll.visible
                    ? {
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)',
                        maskImage: 'linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)'
                      }
                    : undefined
                }
              >
                <div className="max-w-7xl mx-auto px-10 sm:px-12 flex items-center gap-2 min-w-max py-1.5">
                  <button
                    onClick={() => navigate({ name: 'categories' })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black shrink-0 transition-all hover:-translate-y-0.5"
                    style={{ color: themeColors.accentColor }}
                  >
                    <Zap className="w-3.5 h-3.5 animate-pulse" />
                    {t('تصفح حسب الفئة')}
                  </button>
                  <div className="w-px h-5 shrink-0" style={{ backgroundColor: `${themeColors.headerNavText}20` }} />
                  <button
                    onClick={() => navigate({ name: 'category', slug: 'all' })}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-[11px] font-black shrink-0 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor || themeColors.primaryColor})` }}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2.25} />
                    {t('الكل')}
                  </button>
                  {mergeCategories(categories).map((cat) => {
                    const color = categoryColor(cat.slug);
                    const Icon = categoryIcon(cat.slug, cat.icon);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => navigate({ name: 'category', slug: cat.slug })}
                        className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shrink-0"
                        style={{
                          backgroundColor: `${themeColors.headerNavText}10`,
                          color: themeColors.headerNavText,
                          borderColor: `${themeColors.headerNavText}20`,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                          style={{
                            backgroundColor: `${color}22`,
                            color
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-extrabold whitespace-nowrap">{lang === 'en' ? (cat.name_en || t(cat.name)) : cat.name}</span>
                        <ArrowUpLeft className="w-3 h-3 opacity-0 group-hover:opacity-60 -mt-1 -ms-0.5 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {catScroll.visible && (
                <>
                  <button
                    type="button"
                    onClick={() => scrollCatTo('start')}
                    disabled={catScroll.atStart}
                    aria-label={t('تحريك الفئات للبداية')}
                    className="absolute top-1/2 -translate-y-1/2 start-1 z-10 flex items-center justify-center w-8 h-8 rounded-full border backdrop-blur transition-all duration-300 disabled:opacity-0 disabled:cursor-default enabled:hover:shadow-lg enabled:active:scale-90"
                    style={{
                      backgroundColor: `${themeColors.headerNavBg}e6`,
                      borderColor: `${themeColors.headerNavText}25`,
                      color: themeColors.headerNavText,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
                    }}
                  >
                    {lang === 'en' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCatTo('end')}
                    disabled={catScroll.atEnd}
                    aria-label={t('تحريك الفئات للنهاية')}
                    className="absolute top-1/2 -translate-y-1/2 end-1 z-10 flex items-center justify-center w-8 h-8 rounded-full border backdrop-blur transition-all duration-300 disabled:opacity-0 disabled:cursor-default enabled:hover:shadow-lg enabled:active:scale-90"
                    style={{
                      backgroundColor: `${themeColors.headerNavBg}e6`,
                      borderColor: `${themeColors.headerNavText}25`,
                      color: themeColors.headerNavText,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
                    }}
                  >
                    {lang === 'en' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 4. MOBILE DRAWER MENU */}
        {menuOpen && (
          <div
            className="md:hidden py-4 px-4 border-t space-y-4 animate-fade-in shadow-2xl"
            style={{
              backgroundColor: themeColors.headerBg,
              borderColor: `${themeColors.headerText}15`,
              color: themeColors.headerText
            }}
          >
            {storeConfig.purchasesEnabled && (
            <button
              onClick={() => {
                setMenuOpen(false);
                setLocationModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold"
              style={{
                backgroundColor: `${themeColors.headerText}05`,
                borderColor: `${themeColors.headerText}10`,
                color: themeColors.headerText
              }}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
                <span>{t('موقع التوصيل: {0}', [displayLocation])}</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-55" />
            </button>
            )}

            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('ابحث باسم الدواء أو المنتج...')}
                  className="w-full pr-11 pl-20 py-3 rounded-2xl text-xs font-medium focus:outline-none border"
                  style={{
                    backgroundColor: `${themeColors.headerText}05`,
                    borderColor: `${themeColors.headerText}15`,
                    color: themeColors.headerText
                  }}
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: themeColors.primaryColor }}
                >
                  <Search className="w-4 h-4" />
                </button>
                {headerConfig.showBarcode && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setBarcodeModalOpen(true);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border"
                    style={{
                      backgroundColor: `${themeColors.primaryColor}20`,
                      color: themeColors.primaryColor,
                      borderColor: `${themeColors.primaryColor}30`
                    }}
                  >
                    <Barcode className="w-4 h-4" />
                    {t('باركود')}
                  </button>
                )}
              </div>
            </form>

            {headerConfig.showPrescriptionBar && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setPrescriptionModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:brightness-110"
                style={{ backgroundColor: headerConfig.prescriptionBarColor }}
              >
                <FileText className="w-4 h-4" />
                {t('رفع روشتة طبية أو صورة الدواء')}
              </button>
            )}

            {headerConfig.showWhatsAppButton && settings.contact_whatsapp && (
              <a
                href={buildWhatsAppLink(settings.contact_whatsapp, t('مرحباً، أحتاج مساعدة من صيدليتي'))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 w-full rounded-2xl text-xs font-extrabold text-white"
                style={{ backgroundColor: themeColors.whatsappBtnBg }}
              >
                <Send className="w-4 h-4" />
                {t('تواصل معنا مباشر عبر واتساب')}
              </a>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: `${themeColors.headerText}10` }}>
              <button
                onClick={toggleLang}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95"
                style={{
                  backgroundColor: `${themeColors.headerText}05`,
                  borderColor: `${themeColors.headerText}10`,
                  color: themeColors.headerText
                }}
              >
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${themeColors.primaryColor}15`, color: themeColors.primaryColor }}
                >
                  <Languages className="w-[18px] h-[18px]" />
                </span>
                <span className="text-[10px] font-black">{lang === 'ar' ? 'English' : t('العربية')}</span>
              </button>
              <button
                onClick={toggleDarkMode}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95"
                style={{
                  backgroundColor: `${themeColors.headerText}05`,
                  borderColor: `${themeColors.headerText}10`,
                  color: themeColors.headerText
                }}
              >
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${themeColors.accent2Color}15`, color: themeColors.accent2Color }}
                >
                  {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                </span>
                <span className="text-[10px] font-black">{darkMode ? t('الوضع الفاتح') : t('الوضع الليلي')}</span>
              </button>
            </div>
          </div>
        )}
      </header>
      </div>

      {/* ALL MODALS */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <BarcodeScannerModal
        open={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        onScan={handleBarcodeScanResult}
      />
      <LocationSelectorModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={displayLocation}
        onSelectLocation={handleLocationChange}
      />
      <PrescriptionUploadModal
        open={prescriptionModalOpen}
        onClose={() => setPrescriptionModalOpen(false)}
      />
    </>
  );
}
