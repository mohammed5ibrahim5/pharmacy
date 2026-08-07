import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { SiteSettings, HeaderConfig, FooterConfig, HeroConfig, StoreConfig, HowItWorksConfig } from '@/types';
import type { PaymentConfig } from '@/lib/orders';

export interface ThemeColors {
  headerBg: string;
  headerText: string;
  headerNavBg: string;
  headerNavText: string;
  heroBgStart: string;
  heroBgMiddle: string;
  heroBgEnd: string;
  heroText: string;
  heroBtnBg: string;
  heroBtnText: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  statsCardBg: string;
  statsCardText: string;
  pharmacyHoverBorder: string;
  footerBg: string;
  footerText: string;
  announcementBg: string;
  announcementText: string;
  headerSearchBg: string;
  headerSearchText: string;
  sectionBg: string;
  sectionAltBg: string;
  sectionHeadingText: string;
  sectionSubheadingText: string;
  badgePillBg: string;
  badgePillText: string;
  cardBg: string;
  cardText: string;
  cardMutedText: string;
  cardHoverBorder: string;
  priceColor: string;
  discountBadgeBg: string;
  discountBadgeText: string;
  inStockColor: string;
  outOfStockColor: string;
  ratingColor: string;
  pharmacyHeaderBg: string;
  pharmacyHeaderText: string;
  tabActiveBg: string;
  tabActiveText: string;
  pageSearchBg: string;
  pageSearchText: string;
  modalHeaderBg: string;
  modalHeaderText: string;
  modalBodyBg: string;
  modalBodyText: string;
  whatsappBtnBg: string;
  bottomNavBg: string;
  bottomNavText: string;
  bottomNavActiveText: string;
}

export const DEFAULT_THEME_COLORS: ThemeColors = {
  headerBg: '#ffffff',
  headerText: '#0f172a',
  headerNavBg: '#0f766e',
  headerNavText: '#ffffff',
  heroBgStart: '#f0fdfa',
  heroBgMiddle: '#f0fdfa',
  heroBgEnd: '#f8fafc',
  heroText: '#0f172a',
  heroBtnBg: '#0d9488',
  heroBtnText: '#ffffff',
  primaryColor: '#0d9488',
  secondaryColor: '#0f766e',
  accentColor: '#f59e0b',
  statsCardBg: '#ffffff',
  statsCardText: '#0f172a',
  pharmacyHoverBorder: '#0d9488',
  footerBg: '#0f172a',
  footerText: '#cbd5e1',
  announcementBg: '#0d9488',
  announcementText: '#ffffff',
  headerSearchBg: '#f1f5f9',
  headerSearchText: '#334155',
  sectionBg: '#ffffff',
  sectionAltBg: '#f8fafc',
  sectionHeadingText: '#0f172a',
  sectionSubheadingText: '#64748b',
  badgePillBg: '#0d9488',
  badgePillText: '#0d9488',
  cardBg: '#ffffff',
  cardText: '#0f172a',
  cardMutedText: '#64748b',
  cardHoverBorder: '#0d9488',
  priceColor: '#0d9488',
  discountBadgeBg: '#dc2626',
  discountBadgeText: '#ffffff',
  inStockColor: '#16a34a',
  outOfStockColor: '#dc2626',
  ratingColor: '#f59e0b',
  pharmacyHeaderBg: '#f0fdfa',
  pharmacyHeaderText: '#0f172a',
  tabActiveBg: '#0d9488',
  tabActiveText: '#ffffff',
  pageSearchBg: '#f1f5f9',
  pageSearchText: '#334155',
  modalHeaderBg: '#0d9488',
  modalHeaderText: '#ffffff',
  modalBodyBg: '#ffffff',
  modalBodyText: '#0f172a',
  whatsappBtnBg: '#25d366',
  bottomNavBg: '#ffffff',
  bottomNavText: '#94a3b8',
  bottomNavActiveText: '#0d9488',
};

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  showLocationBar: true,
  locationText: 'القاهرة - المعادي',
  showServiceBar: true,
  serviceText: 'خدمة 24/7 طوارئ ودعم صيدلي مباشر',
  showPrescriptionBar: true,
  prescriptionBarColor: '#0d9488',
  topBarColor: '#0f172a',
  topBarTextColor: '#cbd5e1',
  showVoiceSearch: true,
  showBarcode: true,
  showTrendingTags: true,
  showWhatsAppButton: true,
  showCategoryPills: true,
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  showNewsletter: true,
  newsletterTitle: 'اشترك في النشرة الطبية وخصومات الأدوية',
  newsletterSubtitle: 'احصل على أحدث عروض الصيدليات والبدائل المتاحة أولاً بأول',
  newsletterButtonText: 'اشترك',
  newsletterInputPlaceholder: 'أدخل بريدك الإلكتروني...',
  newsletterSuccessText: 'تم الاشتراك بنجاح في النشرة!',
  newsletterBgStart: '#0d9488',
  newsletterBgEnd: '#0f766e',
  newsletterTextColor: '#ffffff',
  newsletterBtnBg: '#ffffff',
  newsletterBtnText: '#0d9488',
  newsletterBgImage: '',
  showQuickLinks: true,
  quickLinksTitle: 'روابط المنصة',
  showContactSection: true,
  contactTitle: 'تواصل ومساعدة',
  showSocialSection: true,
  socialTitle: 'تابعنا على التواصل',
  socialText: 'تصفح آخر الأدوية، الإرشادات الصحية والعروض الدورية عبر منصاتنا.',
  showTrustBadges: true,
  trustBadge1: 'طبي موثوق',
  trustBadge2: 'توصيل 24 ساعة',
  trustBadge3: 'خدمة على مدار اليوم',
  footerTagline: 'صيدليتك الأقرب أينما كنت',
  showCopyright: true,
  showBottomNotice: true,
  bottomNoticeText: 'الأدوية تُصرف بناءً على التشخيص الطبي والاشتراطات الصحية',
};

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  vodafoneCash: '',
  instapay: '',
  deliveryFee: '25',
  freeDeliveryThreshold: '300',
  showCashOnDelivery: true,
  cashOnDeliveryFee: '10',
  shippingNote: 'التوصيل داخل المعادي خلال 30 دقيقة، وفي باقي المناطق خلال 24 ساعة',
};

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  purchasesEnabled: true,
  contactMessage: 'للشراء يرجى التواصل مع الصيدلية مباشرة',
};

export interface LoyaltyConfig {
  enabled: boolean;
  pointsPerOrder: number;
  pointsPerPound: number;
  redeemThreshold: number;
  redeemValue: number;
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: true,
  pointsPerOrder: 10,
  pointsPerPound: 1,
  redeemThreshold: 50,
  redeemValue: 50,
};

export interface FeaturesConfig {
  priceCompare: boolean;
  orderTracking: boolean;
  stockAlerts: boolean;
  reminders: boolean;
}

export const DEFAULT_FEATURES_CONFIG: FeaturesConfig = {
  priceCompare: true,
  orderTracking: true,
  stockAlerts: true,
  reminders: true,
};

export const DEFAULT_HOW_IT_WORKS_CONFIG: HowItWorksConfig = {
  enabled: true,
  badge: 'خطوات بسيطة وسريعة',
  title: 'كيف تعمل منصتنا؟',
  subtitle: 'من البحث حتى الاستلام في 4 خطوات فقط',
  steps: [
    {
      title: 'ابحث عن دوائك',
      desc: 'ابحث بالاسم، امسح الباركود، استخدم البحث الصوتي، أو ارفع صورة الروشتة.',
    },
    {
      title: 'قارن الصيدليات',
      desc: 'راجع الأسعار والتقييمات واختر الصيدلية الأقرب إليك والأكثر ملاءمة.',
    },
    {
      title: 'اطلب بأمان',
      desc: 'اختر الكمية والطريقة، وادفع إلكترونياً عبر فودافون كاش أو إينستاباي.',
    },
    {
      title: 'استلم في دقائق',
      desc: 'توصيل مباشر وسريع حتى باب منزلك بتغليف محكم وآمن على مدار الساعة.',
    },
  ],
};

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  showSearch: true,
  showTrending: true,
  showStats: true,
  showPrescriptionButton: true,
  showLocationButton: true,
  searchPlaceholder: 'ابحث عن اسم الدواء، المادة الفعالة، أو المنتج...',
  prescriptionButtonText: 'ارفع صورة الروشتة — يراجعها صيدلي حقيقي',
  locationButtonText: 'حدد موقعك لأقرب صيدلية',
  locationSetText: 'تم تحديد موقعك - أقرب الصيدليات أولاً',
  trendingLabel: 'الأكثر بحثاً:',
  trendingKeywords: [
    'بنادول اكسترا',
    'كونجستال',
    'أوميجا 3 بلس',
    'سي ريتارد',
    'أوجمنتين 1 جم',
    'سيتامول',
    'كمامات طبية',
  ],
  stats: [
    { id: 'pharmacies', value: '5+', sub: 'صيدلية شريكة', desc: 'معتمدة ومجاوِرة لك', icon: 'store', auto: true },
    { id: 'products', value: '8+', sub: 'منتج متاح', desc: 'تحديث يومي للأسعار', icon: 'package', auto: true },
    { id: 'customers', value: '10k+', sub: 'عميل سعيد', desc: 'تقييم ممتاز 4.9⭐', icon: 'users' },
    { id: 'delivery', value: '24/7', sub: 'خدمة توصيل', desc: 'شحن آمن وسريع', icon: 'truck' },
  ],
};

interface SettingsContextType {
  settings: SiteSettings;
  themeColors: ThemeColors;
  headerConfig: HeaderConfig;
  footerConfig: FooterConfig;
  paymentConfig: PaymentConfig;
  heroConfig: HeroConfig;
  howItWorksConfig: HowItWorksConfig;
  storeConfig: StoreConfig;
  loyaltyConfig: LoyaltyConfig;
  featuresConfig: FeaturesConfig;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_SETTINGS: SiteSettings = {
  id: '',
  site_name: 'صيدليتي',
  site_tagline: 'صيدلياتك القريبة منك في مكان واحد',
  site_description: null,
  logo_url: null,
  primary_color: '#0d9488',
  secondary_color: '#0f766e',
  accent_color: '#f59e0b',
  contact_phone: null,
  contact_email: null,
  contact_whatsapp: null,
  contact_address: null,
  footer_text: 'جميع الحقوق محفوظة',
  hero_title: 'اعثر على دوائك في أقرب صيدلية',
  hero_subtitle: 'ابحث عن الأدوية واعثر على أقرب صيدلية توفرها',
  facebook_url: null,
  instagram_url: null,
  twitter_url: null,
  about_title: 'من نحن',
  about_text: 'منصة صيدليتي تجمع الصيدليات القريبة منك في مكان واحد',
  features_json: null,
  announcement_text: null,
  announcement_active: false,
  created_at: '',
  updated_at: '',
};

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  themeColors: DEFAULT_THEME_COLORS,
  headerConfig: DEFAULT_HEADER_CONFIG,
  footerConfig: DEFAULT_FOOTER_CONFIG,
  paymentConfig: DEFAULT_PAYMENT_CONFIG,
  heroConfig: DEFAULT_HERO_CONFIG,
  howItWorksConfig: DEFAULT_HOW_IT_WORKS_CONFIG,
  storeConfig: DEFAULT_STORE_CONFIG,
  loyaltyConfig: DEFAULT_LOYALTY_CONFIG,
  featuresConfig: DEFAULT_FEATURES_CONFIG,
  loading: true,
  refresh: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [themeColors, setThemeColors] = useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [heroConfig, setHeroConfig] = useState<HeroConfig>(DEFAULT_HERO_CONFIG);
  const [howItWorksConfig, setHowItWorksConfig] = useState<HowItWorksConfig>(DEFAULT_HOW_IT_WORKS_CONFIG);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(DEFAULT_LOYALTY_CONFIG);
  const [featuresConfig, setFeaturesConfig] = useState<FeaturesConfig>(DEFAULT_FEATURES_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .maybeSingle();

    const siteSettings = data || DEFAULT_SETTINGS;
    setSettings(siteSettings);

    // Extract customized colors from features_json if present
    let colors = { ...DEFAULT_THEME_COLORS };
    let header = { ...DEFAULT_HEADER_CONFIG };
    let footer = { ...DEFAULT_FOOTER_CONFIG };
    let payment = { ...DEFAULT_PAYMENT_CONFIG };
    let hero = { ...DEFAULT_HERO_CONFIG };
    let howItWorks = { ...DEFAULT_HOW_IT_WORKS_CONFIG };
    let store = { ...DEFAULT_STORE_CONFIG };
    let loyalty = { ...DEFAULT_LOYALTY_CONFIG };
    let features = { ...DEFAULT_FEATURES_CONFIG };
    if (siteSettings.features_json) {
      try {
        const parsed = JSON.parse(siteSettings.features_json);
        if (parsed && parsed.themeColors) {
          colors = { ...DEFAULT_THEME_COLORS, ...parsed.themeColors };
        }
        if (parsed && parsed.headerConfig) {
          header = { ...DEFAULT_HEADER_CONFIG, ...parsed.headerConfig };
        }
        if (parsed && parsed.footerConfig) {
          footer = { ...DEFAULT_FOOTER_CONFIG, ...parsed.footerConfig };
        }
        if (parsed && parsed.paymentConfig) {
          payment = { ...DEFAULT_PAYMENT_CONFIG, ...parsed.paymentConfig };
        }
        if (parsed && parsed.heroConfig) {
          hero = { ...DEFAULT_HERO_CONFIG, ...parsed.heroConfig };
          hero.stats = (hero.stats || []).map((s) => ({ ...s, auto: s.id === 'pharmacies' || s.id === 'products' }));
        }
        if (parsed && parsed.howItWorksConfig) {
          howItWorks = { ...DEFAULT_HOW_IT_WORKS_CONFIG, ...parsed.howItWorksConfig };
        }
        if (parsed && parsed.storeConfig) {
          store = { ...DEFAULT_STORE_CONFIG, ...parsed.storeConfig };
        }
        if (parsed && parsed.loyaltyConfig) {
          loyalty = { ...DEFAULT_LOYALTY_CONFIG, ...parsed.loyaltyConfig };
        }
        if (parsed && parsed.featuresConfig) {
          features = { ...DEFAULT_FEATURES_CONFIG, ...parsed.featuresConfig };
        }
      } catch (e) {
        console.error('Error parsing features_json for themeColors:', e);
      }
    }
    
    // Sync with top-level settings values just in case
    colors.primaryColor = siteSettings.primary_color || colors.primaryColor;
    colors.secondaryColor = siteSettings.secondary_color || colors.secondaryColor;
    colors.accentColor = siteSettings.accent_color || colors.accentColor;

    setThemeColors(colors);
    setHeaderConfig(header);
    setFooterConfig(footer);
    setPaymentConfig(payment);
    setHeroConfig(hero);
    setHowItWorksConfig(howItWorks);
    setStoreConfig(store);
    setLoyaltyConfig(loyalty);
    setFeaturesConfig(features);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      // Set all custom CSS variables dynamically
      root.style.setProperty('--color-primary', themeColors.primaryColor);
      root.style.setProperty('--color-secondary', themeColors.secondaryColor);
      root.style.setProperty('--color-accent', themeColors.accentColor);
      
      root.style.setProperty('--header-bg', themeColors.headerBg);
      root.style.setProperty('--header-text', themeColors.headerText);
      root.style.setProperty('--header-nav-bg', themeColors.headerNavBg);
      root.style.setProperty('--header-nav-text', themeColors.headerNavText);
      
      root.style.setProperty('--hero-bg-start', themeColors.heroBgStart);
      root.style.setProperty('--hero-bg-middle', themeColors.heroBgMiddle);
      root.style.setProperty('--hero-bg-end', themeColors.heroBgEnd);
      root.style.setProperty('--hero-text', themeColors.heroText);
      root.style.setProperty('--hero-btn-bg', themeColors.heroBtnBg);
      root.style.setProperty('--hero-btn-text', themeColors.heroBtnText);
      
      root.style.setProperty('--stats-card-bg', themeColors.statsCardBg);
      root.style.setProperty('--stats-card-text', themeColors.statsCardText);
      root.style.setProperty('--pharmacy-hover-border', themeColors.pharmacyHoverBorder);
      
      root.style.setProperty('--footer-bg', themeColors.footerBg);
      root.style.setProperty('--footer-text', themeColors.footerText);
    }
  }, [settings, themeColors]);

return (
    <SettingsContext.Provider
      value={{
        settings: settings || DEFAULT_SETTINGS,
        themeColors,
        headerConfig,
        footerConfig,
        paymentConfig,
        heroConfig,
        howItWorksConfig,
        storeConfig,
        loyaltyConfig,
        featuresConfig,
        loading,
        refresh: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
