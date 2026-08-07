import React, { useState, useEffect, useRef } from 'react';
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
  Heart,
  Baby,
  Activity,
  Shield,
  Stethoscope,
  Sparkles,
  Droplet,
  Zap,
  PhoneCall,
  Flame,
  ArrowUpLeft,
  ShoppingCart,
  type LucideIcon
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { UserMenu } from '@/components/UserMenu';
import { NotificationsBell } from '@/components/NotificationsBell';
import { AuthModal } from '@/components/AuthModal';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { LocationSelectorModal } from '@/components/LocationSelectorModal';
import { PrescriptionUploadModal } from '@/components/PrescriptionUploadModal';
import { useOrder } from '@/context/OrderContext';
import { supabase } from '@/lib/supabase';
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

const CATEGORY_STYLES: Record<string, { icon: LucideIcon; color: string }> = {
  painkillers: { icon: Pill, color: '#0d9488' },
  antibiotics: { icon: Shield, color: '#2563eb' },
  supplements: { icon: Sparkles, color: '#d97706' },
  'cold-flu': { icon: Stethoscope, color: '#dc2626' },
  vitamins: { icon: Heart, color: '#7c3aed' },
  'skin-care': { icon: Droplet, color: '#db2777' },
  'baby-care': { icon: Baby, color: '#e11d48' },
  digestive: { icon: Activity, color: '#16a34a' },
};

const FALLBACK_CATEGORIES: { slug: string; name: string }[] = [
  { slug: 'painkillers', name: 'مسكنات الألم' },
  { slug: 'antibiotics', name: 'مضادات حيوية' },
  { slug: 'supplements', name: 'مكملات غذائية' },
  { slug: 'cold-flu', name: 'برد وإنفلونزا' },
  { slug: 'vitamins', name: 'فيتامينات' },
  { slug: 'skin-care', name: 'العناية بالبشرة' },
  { slug: 'baby-care', name: 'مستلزمات الأطفال' },
  { slug: 'digestive', name: 'الجهاز الهضمي' },
];

export function Header() {
  const { navigate } = useRouter();
  const { settings, themeColors, headerConfig, storeConfig } = useSettings();
  const { authModalOpen, setAuthModalOpen } = useCustomer();
  const { cartCount, openCart } = useOrder();

  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userLocation, setUserLocation] = useState<string>(() => {
    return localStorage.getItem('user_delivery_location') || 'القاهرة - المعادي';
  });
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

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data && data.length > 0) setCategories(data as Category[]);
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
          const { data } = await supabase
            .from('products')
            .select('*, pharmacy:pharmacies(*)')
            .ilike('name', `%${searchQuery.trim()}%`)
            .limit(5);
          if (data) {
            setSuggestions(data as Product[]);
            setShowSuggestions(true);
          }
        } catch {
          // fallback
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
      setShowSuggestions(false);
      setMenuOpen(false);
    }
  };

  const handleBarcodeScanResult = (scannedValue: string) => {
    setSearchQuery(scannedValue);
    handleSearchSubmit(undefined, scannedValue);
  };

  const handleLocationChange = (newLoc: string) => {
    setUserLocation(newLoc);
    localStorage.setItem('user_delivery_location', newLoc);
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
      alert('البحث الصوتي غير مدعوم في متصفحك الحالي.');
    }
  };

  return (
    <>
{/* 1. TOP UTILITY BAR */}
      <div
        className="text-xs py-2 px-4 border-b hidden sm:block transition-all duration-300"
        style={{
          backgroundColor: headerConfig.topBarColor,
          color: headerConfig.topBarTextColor,
          borderColor: `${headerConfig.topBarTextColor}15`
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {headerConfig.showLocationBar && (
            <button
              onClick={() => setLocationModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 hover:bg-black/35 transition-all border border-white/10 shadow-inner group"
              style={{ color: headerConfig.topBarTextColor }}
            >
              <MapPin className="w-3.5 h-3.5" style={{ color: themeColors.accentColor }} />
              <span>التوصيل إلى: <strong className="text-white font-bold">{userLocation}</strong></span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          )}

          <div className={`flex items-center gap-4 font-semibold ${headerConfig.showLocationBar ? '' : 'mr-auto'}`}>
            {headerConfig.showServiceBar && (
              <span className="flex items-center gap-1.5 font-bold" style={{ color: themeColors.accentColor }}>
                <Zap className="w-3.5 h-3.5 animate-pulse" />
                {headerConfig.serviceText}
              </span>
            )}

            {headerConfig.showPrescriptionBar && (
              <button
                onClick={() => setPrescriptionModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-white font-bold transition-all shadow-md active:scale-95 hover:brightness-110"
                style={{ backgroundColor: headerConfig.prescriptionBarColor }}
              >
                <FileText className="w-3.5 h-3.5" />
                رفع روشتة طبية
              </button>
            )}

            {settings.contact_phone && (
              <a
                href={`tel:${settings.contact_phone}`}
                className="flex items-center gap-1 hover:brightness-125 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" style={{ color: themeColors.primaryColor }} />
                <span dir="ltr">{settings.contact_phone}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <header
        className="sticky top-0 z-50 border-b shadow-sm transition-all duration-300 backdrop-blur-xl"
        style={{
          backgroundColor: `${themeColors.headerBg}f2`,
          color: themeColors.headerText,
          borderColor: `${themeColors.headerText}15`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3 sm:gap-6">
            {/* Logo */}
            <button
              onClick={() => navigate({ name: 'home' })}
              className="flex items-center gap-3 shrink-0 group text-right"
            >
              <div
                className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: themeColors.primaryColor,
                  boxShadow: `0 8px 24px -4px ${themeColors.primaryColor}66`,
                }}
              >
                <Cross className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
                <span
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 animate-pulse"
                  style={{
                    backgroundColor: themeColors.accentColor,
                    borderColor: themeColors.headerBg
                  }}
                />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black leading-tight" style={{ color: themeColors.headerText }}>
                  {settings.site_name}
                </h1>
                <p className="text-[10px] sm:text-xs font-bold hidden sm:block opacity-80" style={{ color: themeColors.primaryColor }}>
                  {settings.site_tagline}
                </p>
              </div>
            </button>

            {/* SEARCH HUB - Desktop */}
            <div className="hidden md:flex flex-1 max-w-2xl relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="w-full relative group">
                <div
                  className="relative flex items-center rounded-full border p-1 transition-all shadow-inner"
                  style={{ backgroundColor: themeColors.headerSearchBg, borderColor: `${themeColors.headerText}22` }}
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                    placeholder="ابحث باسم الدواء، المادة الفعالة، أو امسح الباركود..."
                    className="w-full pr-5 pl-24 py-2.5 bg-transparent text-xs sm:text-sm font-bold placeholder:font-medium focus:outline-none"
                    style={{ color: themeColors.headerSearchText }}
                  />

                  <button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8.5 h-8.5 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 shadow-md hover:brightness-110"
                    style={{ backgroundColor: themeColors.primaryColor }}
                    title="بحث"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r pr-2"
                    style={{ borderColor: `${themeColors.headerText}22` }}
                  >
                    {headerConfig.showVoiceSearch && (
                  <button
                    type="button"
                    onClick={handleVoiceSearch}
                    className={`p-1.5 rounded-full transition-colors ${
                      isListening ? 'text-red-500 animate-bounce' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ color: themeColors.headerSearchText }}
                    title="بحث بالصوت"
                  >
                        <Mic className="w-4 h-4" />
                      </button>
                    )}

                    {headerConfig.showBarcode && (
                      <button
                        type="button"
                        onClick={() => setBarcodeModalOpen(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-xs font-extrabold shadow-sm border hover:brightness-105"
                        style={{
                          backgroundColor: `${themeColors.primaryColor}15`,
                          color: themeColors.primaryColor,
                          borderColor: `${themeColors.primaryColor}33`
                        }}
                        title="ماسح باركود وتصوير المنتج"
                      >
                        <Barcode className="w-4 h-4" />
                        <span className="text-[10px] hidden lg:inline">باركود</span>
                      </button>
                    )}
                  </div>
                </div>
              </form>

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
                    <span>نتائج وتلميحات البحث الحية:</span>
                    <span className="text-[10px] font-bold" style={{ color: themeColors.primaryColor }}>اضغط للانتقال</span>
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
                          className="w-full p-3 flex items-center gap-3 transition-colors text-right group hover:bg-black/[0.03]"
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
                              {product.name}
                            </p>
                            {product.pharmacy && (
                              <p className="text-[10px] opacity-60 truncate" style={{ color: themeColors.headerText }}>
                                صيدلية: {product.pharmacy.name}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-black" style={{ color: themeColors.primaryColor }}>
                            {product.price} ج.م
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs opacity-60 space-y-1" style={{ color: themeColors.headerText }}>
                      <p>اضغط إنتر أو زِر البحث لعرض جميع الأدوية المطابقة لـ "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT HEADER ACTIONS */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {settings.contact_whatsapp && headerConfig.showWhatsAppButton && (
                <a
                  href={`https://wa.me/${settings.contact_whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold text-white transition-all hover:scale-[1.03] active:scale-95 shadow-md hover:brightness-110"
                  style={{ backgroundColor: themeColors.whatsappBtnBg, boxShadow: `0 4px 14px -2px ${themeColors.whatsappBtnBg}88` }}
                >
                  <Send className="w-4 h-4" />
                  واتساب
                </a>
              )}

              {headerConfig.showPrescriptionBar && (
                <button
                  onClick={() => setPrescriptionModalOpen(true)}
                  className="flex md:hidden p-2.5 rounded-2xl border hover:brightness-115 transition-colors"
                  style={{
                    backgroundColor: `${headerConfig.prescriptionBarColor}15`,
                    color: headerConfig.prescriptionBarColor,
                    borderColor: `${headerConfig.prescriptionBarColor}33`
                  }}
                  title="رفع روشتة"
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}

              {headerConfig.showBarcode && (
                <button
                  onClick={() => setBarcodeModalOpen(true)}
                  className="flex md:hidden p-2.5 rounded-2xl border transition-colors"
                  style={{
                    backgroundColor: `${themeColors.headerText}08`,
                    color: themeColors.headerText,
                    borderColor: `${themeColors.headerText}15`
                  }}
                  title="مسح باركود"
                >
                  <Barcode className="w-5 h-5" />
                </button>
              )}

              <NotificationsBell />

              {storeConfig.purchasesEnabled && (
                <button
                  onClick={() => openCart('cart')}
                  className={`relative p-2.5 rounded-2xl border transition-colors ${cartBump ? 'animate-cart-bump' : ''}`}
                  style={{
                    backgroundColor: `${themeColors.headerText}08`,
                    color: themeColors.headerText,
                    borderColor: `${themeColors.headerText}15`
                  }}
                  title="سلة التسوق"
                  aria-label="سلة التسوق"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span
                      className="absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center border-2"
                      style={{ backgroundColor: themeColors.priceColor, borderColor: themeColors.headerBg }}
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              )}

              <UserMenu />

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2.5 rounded-2xl border transition-colors"
                style={{
                  backgroundColor: `${themeColors.headerText}08`,
                  color: themeColors.headerText,
                  borderColor: `${themeColors.headerText}15`
                }}
                aria-label="القائمة"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* TRENDING QUICK SEARCH TAGS — secondary "suggestions" strip */}
          {headerConfig.showTrendingTags && (
            <div
              className="flex items-center gap-2 py-2 px-4 lg:px-0 overflow-x-auto scrollbar-none"
              style={{
                backgroundColor: `${themeColors.headerText}03`,
                borderBottom: `1px solid ${themeColors.headerText}08`
              }}
            >
              <span className="font-bold opacity-50 flex items-center gap-1 shrink-0 text-[11px] whitespace-nowrap" style={{ color: themeColors.headerText }}>
                <Flame className="w-3.5 h-3.5" style={{ color: themeColors.accentColor, opacity: 0.55 }} />
                الأكثر طلباً:
              </span>
              {UNIFIED_TRENDING.map((tag, i) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchQuery(tag);
                    handleSearchSubmit(undefined, tag);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full transition-all shrink-0 text-[11px] font-bold hover:bg-white active:scale-95"
                  style={{
                    backgroundColor: `${themeColors.headerText}08`,
                    color: themeColors.headerText,
                    border: `1px solid ${themeColors.headerText}12`
                  }}
                >
                  <span className="text-[9px] font-black" style={{ color: themeColors.headerText, opacity: 0.45 }}>
                    {i + 1}
                  </span>
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. CATEGORY QUICK NAVIGATION BAR */}
        {headerConfig.showCategoryPills && (
          <div
            className="py-2 overflow-x-auto scrollbar-none transition-all duration-300"
            style={{
              backgroundColor: themeColors.headerNavBg,
              color: themeColors.headerNavText
            }}
          >
            <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 min-w-max">
              <span
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black shrink-0"
                style={{ color: themeColors.accentColor }}
              >
                <Zap className="w-3.5 h-3.5 animate-pulse" />
                تصفح حسب الفئة
              </span>
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: `${themeColors.headerNavText}20` }} />
              {(categories.length > 0 ? categories : FALLBACK_CATEGORIES).map((cat) => {
                const style = CATEGORY_STYLES[cat.slug] || {
                  icon: Pill,
                  color: themeColors.accentColor,
                };
                const Icon = style.icon;
                return (
                  <button
                    key={cat.slug}
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
                        backgroundColor: `${style.color}22`,
                        color: style.color
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-extrabold whitespace-nowrap">{cat.name}</span>
                    <ArrowUpLeft className="w-3 h-3 opacity-0 group-hover:opacity-60 -mt-1 -mr-0.5 transition-opacity" />
                  </button>
                );
              })}
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
                <span>موقع التوصيل: {userLocation}</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-55" />
            </button>

            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الدواء أو المنتج..."
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
                    باركود
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
                رفع روشتة طبية أو صورة الدواء
              </button>
            )}

            {headerConfig.showWhatsAppButton && settings.contact_whatsapp && (
              <a
                href={`https://wa.me/${settings.contact_whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 w-full rounded-2xl text-xs font-extrabold text-white"
                style={{ backgroundColor: themeColors.whatsappBtnBg }}
              >
                <Send className="w-4 h-4" />
                تواصل معنا مباشر عبر واتساب
              </a>
            )}
          </div>
        )}
      </header>

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
        currentLocation={userLocation}
        onSelectLocation={handleLocationChange}
      />
      <PrescriptionUploadModal
        open={prescriptionModalOpen}
        onClose={() => setPrescriptionModalOpen(false)}
      />
    </>
  );
}
