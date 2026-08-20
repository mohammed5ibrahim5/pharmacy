import { createContext, useContext, useEffect, useLayoutEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { SiteSettings, HeaderConfig, FooterConfig, HeroConfig, StoreConfig, HowItWorksConfig, HomepageConfig } from '@/types';
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
  accent2Color: string;
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
  headerText: '#1e2a4a',
  headerNavBg: '#0f766e',
  headerNavText: '#ffffff',
  heroBgStart: '#f0fdfa',
  heroBgMiddle: '#f0fdfa',
  heroBgEnd: '#f8fafc',
  heroText: '#1e2a4a',
  heroBtnBg: '#0d9488',
  heroBtnText: '#ffffff',
  primaryColor: '#0d9488',
  secondaryColor: '#0f766e',
  accentColor: '#f59e0b',
  accent2Color: '#4f46e5',
  pharmacyHoverBorder: '#0d9488',
  footerBg: '#0f172a',
  footerText: '#cbd5e1',
  announcementBg: '#0d9488',
  announcementText: '#ffffff',
  headerSearchBg: '#f1f5f9',
  headerSearchText: '#334155',
  sectionBg: '#ffffff',
  sectionAltBg: '#f8fafc',
  sectionHeadingText: '#1e2a4a',
  sectionSubheadingText: '#5b6b84',
  badgePillBg: '#0d9488',
  badgePillText: '#0d9488',
  cardBg: '#ffffff',
  cardText: '#1e2a4a',
  cardMutedText: '#6b7a93',
  cardHoverBorder: '#0d9488',
  priceColor: '#0d9488',
  discountBadgeBg: '#dc2626',
  discountBadgeText: '#ffffff',
  inStockColor: '#16a34a',
  outOfStockColor: '#dc2626',
  ratingColor: '#f59e0b',
  pharmacyHeaderBg: '#f0fdfa',
  pharmacyHeaderText: '#1e2a4a',
  tabActiveBg: '#0d9488',
  tabActiveText: '#ffffff',
  pageSearchBg: '#f1f5f9',
  pageSearchText: '#334155',
  modalHeaderBg: '#0d9488',
  modalHeaderText: '#ffffff',
  modalBodyBg: '#ffffff',
  modalBodyText: '#1e2a4a',
  whatsappBtnBg: '#25d366',
  bottomNavBg: '#ffffff',
  bottomNavText: '#94a3b8',
  bottomNavActiveText: '#0d9488',
};

function toDarkPalette(c: ThemeColors): ThemeColors {
  return {
    ...c,
    headerBg: '#0f172a',
    headerText: '#e2e8f0',
    headerNavBg: '#0b1220',
    headerNavText: '#e2e8f0',
    heroBgStart: '#0b1220',
    heroBgMiddle: '#111827',
    heroBgEnd: '#0f172a',
    heroText: '#f1f5f9',
    heroBtnBg: c.primaryColor,
    heroBtnText: '#ffffff',
    pharmacyHoverBorder: c.pharmacyHoverBorder,
    footerBg: '#020617',
    footerText: '#94a3b8',
    announcementBg: c.primaryColor,
    announcementText: '#ffffff',
    headerSearchBg: '#1e293b',
    headerSearchText: '#e2e8f0',
    sectionBg: '#0f172a',
    sectionAltBg: '#111827',
    sectionHeadingText: '#f1f5f9',
    sectionSubheadingText: '#94a3b8',
    badgePillBg: c.badgePillBg,
    badgePillText: c.badgePillText,
    cardBg: '#111827',
    cardText: '#f1f5f9',
    cardMutedText: '#94a3b8',
    cardHoverBorder: c.cardHoverBorder,
    priceColor: c.priceColor,
    discountBadgeBg: c.discountBadgeBg,
    discountBadgeText: '#ffffff',
    inStockColor: '#34d399',
    outOfStockColor: '#f87171',
    ratingColor: '#fbbf24',
    pharmacyHeaderBg: '#111827',
    pharmacyHeaderText: '#f1f5f9',
    tabActiveBg: c.primaryColor,
    tabActiveText: '#ffffff',
    pageSearchBg: '#1e293b',
    pageSearchText: '#e2e8f0',
    modalHeaderBg: '#111827',
    modalHeaderText: '#f1f5f9',
    modalBodyBg: '#111827',
    modalBodyText: '#f1f5f9',
    whatsappBtnBg: c.whatsappBtnBg,
    bottomNavBg: '#0f172a',
    bottomNavText: '#94a3b8',
    bottomNavActiveText: c.bottomNavActiveText,
  };
}

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  showTopBar: true,
  showLocationBar: true,
  locationText: 'القاهرة - المعادي',
  locationText_en: 'Cairo - Maadi',
  showServiceBar: true,
  serviceText: 'خدمة 24/7 طوارئ ودعم صيدلي مباشر',
  serviceText_en: '24/7 emergency service with direct pharmacist support',
  showPrescriptionBar: true,
  prescriptionBarColor: '#0d9488',
  topBarColor: '#0f172a',
  topBarTextColor: '#cbd5e1',
  showContactPhone: true,
  showVoiceSearch: true,
  showBarcode: true,
  showTrendingTags: true,
  trendingMode: 'auto',
  trendingKeywords: [
    'بنادول اكسترا',
    'كونجستال',
    'أوميجا 3 بلس',
    'سي ريتارد',
    'أوجمنتين 1 جم',
    'سيتامول',
    'كمامات طبية',
  ],
  showWhatsAppButton: true,
  showCategoryPills: true,
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  showNewsletter: true,
  newsletterTitle: 'اشترك في النشرة الطبية وخصومات الأدوية',
  newsletterTitle_en: 'Subscribe to medical news and medicine discounts',
  newsletterSubtitle: 'احصل على أحدث عروض الصيدليات والبدائل المتاحة أولاً بأول',
  newsletterSubtitle_en: 'Get the latest pharmacy offers and available alternatives first',
  newsletterButtonText: 'اشترك',
  newsletterButtonText_en: 'Subscribe',
  newsletterInputPlaceholder: 'أدخل بريدك الإلكتروني...',
  newsletterInputPlaceholder_en: 'Enter your email...',
  newsletterSuccessText: 'تم الاشتراك بنجاح في النشرة!',
  newsletterSuccessText_en: 'Successfully subscribed to the newsletter!',
  newsletterBgStart: '#0d9488',
  newsletterBgEnd: '#0f766e',
  newsletterTextColor: '#ffffff',
  newsletterBtnBg: '#ffffff',
  newsletterBtnText: '#0d9488',
  newsletterBgImage: '',
  showQuickLinks: true,
  quickLinksTitle: 'روابط المنصة',
  quickLinksTitle_en: 'Platform links',
  showContactSection: true,
  contactTitle: 'تواصل ومساعدة',
  contactTitle_en: 'Contact & help',
  showSocialSection: true,
  socialTitle: 'تابعنا على التواصل',
  socialTitle_en: 'Follow us',
  socialText: 'تصفح آخر الأدوية، الإرشادات الصحية والعروض الدورية عبر منصاتنا.',
  socialText_en: 'Browse the latest medicines, health tips and recurring offers through our platforms.',
  showTrustBadges: true,
  trustBadge1: 'طبي موثوق',
  trustBadge1_en: 'Trusted medical',
  trustBadge2: 'توصيل 24 ساعة',
  trustBadge2_en: '24-hour delivery',
  trustBadge3: 'خدمة على مدار اليوم',
  trustBadge3_en: 'Service around the clock',
  footerTagline: 'صيدليتك الأقرب أينما كنت',
  footerTagline_en: 'Your nearest pharmacy, wherever you are',
  showCopyright: true,
  showBottomNotice: true,
  bottomNoticeText: 'الأدوية تُصرف بناءً على التشخيص الطبي والاشتراطات الصحية',
  bottomNoticeText_en: 'Medicines are dispensed based on medical diagnosis and health requirements',
};

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  vodafoneCash: '',
  instapay: '',
  deliveryFee: '25',
  freeDeliveryThreshold: '300',
  showCashOnDelivery: true,
  showOnlinePayment: true,
  cashOnDeliveryFee: '10',
  shippingNote: 'التوصيل داخل المعادي خلال 30 دقيقة، وفي باقي المناطق خلال 24 ساعة',
};

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  purchasesEnabled: true,
  contactMessage: 'للشراء يرجى التواصل مع الصيدلية مباشرة',
  contactMessage_en: 'To purchase, please contact the pharmacy directly',
  catalogWhatsapp: '',
  catalogMultiPharmacy: false,
};

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  pharmaciesTitle: 'الصيدليات المتاحة بجوارك',
  pharmaciesTitle_en: 'Pharmacies near you',
  pharmaciesSubtitle: 'تصفح الصيدليات حسب تصنيف احتياجك',
  pharmaciesSubtitle_en: 'Browse pharmacies by your needs',
  trust: {
    showSection: true,
    showBottomBar: true,
    cards: {
      licensed: true,
      secure: true,
      pharmacists: true,
      fastDelivery: true,
      authentic: true,
      support: true,
    },
  },
  heroBadges: {
    showBadges: true,
    badges: [
      { id: 'delivery', icon: 'truck', title: 'توصيل فوري', title_en: 'Instant delivery', subtitle: 'أقل من 30 دقيقة', subtitle_en: 'In less than 30 minutes', color: '#f59e0b', enabled: true },
      { id: 'discounts', icon: 'badgepercent', title: 'خصومات وتخفيضات', title_en: 'Discounts and offers', subtitle: 'عروض تصل إلى 30%', subtitle_en: 'Deals up to 30% off', color: '#ec4899', enabled: true },
      { id: 'certified', icon: 'badgecheck', title: 'صيدليات معتمدة 100%', title_en: '100% certified pharmacies', subtitle: 'مرخّصة من هيئة الدواء', subtitle_en: 'Licensed by the Drug Authority', color: '#10b981', enabled: true },
      { id: 'support', icon: 'phone', title: 'دعم فوري 24/7', title_en: '24/7 instant support', subtitle: 'متاح دائماً لمساعدتك', subtitle_en: 'Always available to help you', color: '#3b82f6', enabled: true },
    ],
  },
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
  orderTracking: boolean;
  stockAlerts: boolean;
  reminders: boolean;
  familyMembers: boolean;
  doseCalculator: boolean;
  priceCompare: boolean;
  pharmacyCompare: boolean;
}

export const DEFAULT_FEATURES_CONFIG: FeaturesConfig = {
  orderTracking: true,
  stockAlerts: true,
  reminders: true,
  familyMembers: true,
  doseCalculator: true,
  priceCompare: true,
  pharmacyCompare: true,
};

export interface WelcomePopupConfig {
  enabled: boolean;
  badgeText: string;
  badgeText_en: string | null;
  title: string;
  title_en: string | null;
  subtitle: string;
  subtitle_en: string | null;
  offerCode: string;
  discountPercent: number;
  delaySeconds: number;
  showCountdown: boolean;
  ctaText: string;
  ctaText_en: string | null;
  laterText: string;
  laterText_en: string | null;
}

export const DEFAULT_WELCOME_POPUP_CONFIG: WelcomePopupConfig = {
  enabled: true,
  badgeText: 'عرض ترحيبي خاص',
  badgeText_en: 'Special welcome offer',
  title: 'خصم {percent}% على طلبك الأول',
  title_en: '{percent}% off your first order',
  subtitle: 'ادخل الكود عند إتمام الطلب واستفد بالخصم',
  subtitle_en: 'Enter the code at checkout and enjoy your discount',
  offerCode: 'WELCOME10',
  discountPercent: 10,
  delaySeconds: 4,
  showCountdown: true,
  ctaText: 'ابدأ التسوق الآن',
  ctaText_en: 'Start shopping now',
  laterText: 'لاحقاً، لن أشتري الآن',
  laterText_en: 'Maybe later',
};

export const DEFAULT_HOW_IT_WORKS_CONFIG: HowItWorksConfig = {
  enabled: true,
  badge: 'خطوات بسيطة وسريعة',
  badge_en: 'Simple and fast steps',
  title: 'كيف تعمل منصتنا؟',
  title_en: 'How does our platform work?',
  subtitle: 'من البحث حتى الاستلام في 4 خطوات فقط',
  subtitle_en: 'From search to delivery in just 4 steps',
  steps: [
    {
      title: 'ابحث عن دوائك',
      title_en: 'Search for your medicine',
      desc: 'ابحث بالاسم، امسح الباركود، استخدم البحث الصوتي، أو ارفع صورة الروشتة.',
      desc_en: 'Search by name, scan a barcode, use voice search, or upload a prescription photo.',
    },
    {
      title: 'قارن الصيدليات',
      title_en: 'Compare pharmacies',
      desc: 'راجع الأسعار والتقييمات واختر الصيدلية الأقرب إليك والأكثر ملاءمة.',
      desc_en: 'Review prices and ratings, and choose the closest and most suitable pharmacy.',
    },
    {
      title: 'اطلب بأمان',
      title_en: 'Order safely',
      desc: 'اختر الكمية والطريقة، وادفع إلكترونياً عبر فودافون كاش أو إينستاباي.',
      desc_en: 'Choose quantity and method, and pay electronically via Vodafone Cash or InstaPay.',
    },
    {
      title: 'استلم في دقائق',
      title_en: 'Receive in minutes',
      desc: 'توصيل مباشر وسريع حتى باب منزلك بتغليف محكم وآمن على مدار الساعة.',
      desc_en: 'Fast direct delivery to your door with secure packaging around the clock.',
    },
  ],
};

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  showSearch: true,
  showTrending: true,
  showPrescriptionButton: true,
  showLocationButton: true,
  searchPlaceholder: 'ابحث عن اسم الدواء، المادة الفعالة، أو المنتج...',
  searchPlaceholder_en: 'Search by medicine name, active ingredient, or product...',
  prescriptionButtonText: 'ارفع صورة الروشتة — يراجعها صيدلي حقيقي',
  prescriptionButtonText_en: 'Upload a prescription photo — reviewed by a real pharmacist',
  locationButtonText: 'حدد موقعك لأقرب صيدلية',
  locationButtonText_en: 'Set your location for the nearest pharmacy',
  locationSetText: 'تم تحديد موقعك - أقرب الصيدليات أولاً',
  locationSetText_en: 'Location set - nearest pharmacies first',
  trendingLabel: 'الأكثر بحثاً:',
  trendingLabel_en: 'Trending now:',
  trendingKeywords: [
    'بنادول اكسترا',
    'كونجستال',
    'أوميجا 3 بلس',
    'سي ريتارد',
    'أوجمنتين 1 جم',
    'سيتامول',
    'كمامات طبية',
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
  homepageConfig: HomepageConfig;
  loyaltyConfig: LoyaltyConfig;
  featuresConfig: FeaturesConfig;
  welcomeConfig: WelcomePopupConfig;
  darkMode: boolean;
  toggleDarkMode: () => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_SETTINGS: SiteSettings = {
  id: '',
  site_name: 'صيدليتي',
  site_name_en: 'Dawai',
  site_tagline: 'صيدلياتك القريبة منك في مكان واحد',
  site_tagline_en: 'Your nearest pharmacy, wherever you are',
  site_description: null,
  site_description_en: null,
  logo_url: null,
  primary_color: '#0d9488',
  secondary_color: '#0f766e',
  accent_color: '#f59e0b',
  contact_phone: null,
  contact_email: null,
  contact_whatsapp: null,
  contact_address: null,
  contact_address_en: null,
  footer_text: 'جميع الحقوق محفوظة',
  footer_text_en: 'All rights reserved',
  hero_title: 'اعثر على دوائك في أقرب صيدلية',
  hero_title_en: 'Find your medicine at the nearest pharmacy',
  hero_subtitle: 'ابحث عن الأدوية واعثر على أقرب صيدلية توفرها',
  hero_subtitle_en: 'Search for medicines and find the nearest pharmacy that stocks them',
  facebook_url: null,
  instagram_url: null,
  twitter_url: null,
  about_title: 'من نحن',
  about_title_en: 'About us',
  about_text: 'منصة صيدليتي تجمع الصيدليات القريبة منك في مكان واحد',
  about_text_en: 'Dawai platform brings the nearest pharmacies to you in one place',
  features_json: null,
  announcement_text: null,
  announcement_text_en: null,
  announcement_active: false,
  created_at: '',
  updated_at: '',
};

const SETTINGS_CACHE_KEY = 'pharmacy-settings-cache-v1';

interface SettingsCache {
  settings: SiteSettings;
  themeColors: ThemeColors;
  headerConfig: HeaderConfig;
  footerConfig: FooterConfig;
  paymentConfig: PaymentConfig;
  heroConfig: HeroConfig;
  howItWorksConfig: HowItWorksConfig;
  storeConfig: StoreConfig;
  homepageConfig: HomepageConfig;
  loyaltyConfig: LoyaltyConfig;
  featuresConfig: FeaturesConfig;
  welcomeConfig: WelcomePopupConfig;
}

function loadSettingsCache(): SettingsCache | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SettingsCache;
    if (!parsed || !parsed.themeColors || !parsed.settings) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSettingsCache(cache: SettingsCache) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage errors
  }
}

const settingsCache = loadSettingsCache();

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  themeColors: DEFAULT_THEME_COLORS,
  headerConfig: DEFAULT_HEADER_CONFIG,
  footerConfig: DEFAULT_FOOTER_CONFIG,
  paymentConfig: DEFAULT_PAYMENT_CONFIG,
  heroConfig: DEFAULT_HERO_CONFIG,
  howItWorksConfig: DEFAULT_HOW_IT_WORKS_CONFIG,
  storeConfig: DEFAULT_STORE_CONFIG,
  homepageConfig: DEFAULT_HOMEPAGE_CONFIG,
  loyaltyConfig: DEFAULT_LOYALTY_CONFIG,
  featuresConfig: DEFAULT_FEATURES_CONFIG,
  welcomeConfig: DEFAULT_WELCOME_POPUP_CONFIG,
  darkMode: false,
  toggleDarkMode: () => {},
  loading: true,
  refresh: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(settingsCache?.settings ?? null);
  const [themeColors, setThemeColors] = useState<ThemeColors>(
    settingsCache?.themeColors ?? DEFAULT_THEME_COLORS,
  );
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(
    settingsCache ? { ...DEFAULT_HEADER_CONFIG, ...settingsCache.headerConfig } : DEFAULT_HEADER_CONFIG,
  );
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(
    settingsCache ? { ...DEFAULT_FOOTER_CONFIG, ...settingsCache.footerConfig } : DEFAULT_FOOTER_CONFIG,
  );
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(
    settingsCache ? { ...DEFAULT_PAYMENT_CONFIG, ...settingsCache.paymentConfig } : DEFAULT_PAYMENT_CONFIG,
  );
  const [heroConfig, setHeroConfig] = useState<HeroConfig>(
    settingsCache ? { ...DEFAULT_HERO_CONFIG, ...settingsCache.heroConfig } : DEFAULT_HERO_CONFIG,
  );
  const [howItWorksConfig, setHowItWorksConfig] = useState<HowItWorksConfig>(
    settingsCache ? { ...DEFAULT_HOW_IT_WORKS_CONFIG, ...settingsCache.howItWorksConfig } : DEFAULT_HOW_IT_WORKS_CONFIG,
  );
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(
    settingsCache ? { ...DEFAULT_STORE_CONFIG, ...settingsCache.storeConfig } : DEFAULT_STORE_CONFIG,
  );
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>(
    settingsCache ? { ...DEFAULT_HOMEPAGE_CONFIG, ...settingsCache.homepageConfig } : DEFAULT_HOMEPAGE_CONFIG,
  );
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(
    settingsCache ? { ...DEFAULT_LOYALTY_CONFIG, ...settingsCache.loyaltyConfig } : DEFAULT_LOYALTY_CONFIG,
  );
  const [featuresConfig, setFeaturesConfig] = useState<FeaturesConfig>(
    settingsCache ? { ...DEFAULT_FEATURES_CONFIG, ...settingsCache.featuresConfig } : DEFAULT_FEATURES_CONFIG,
  );
  const [welcomeConfig, setWelcomeConfig] = useState<WelcomePopupConfig>(
    settingsCache ? { ...DEFAULT_WELCOME_POPUP_CONFIG, ...settingsCache.welcomeConfig } : DEFAULT_WELCOME_POPUP_CONFIG,
  );
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pharmacy-dark-mode') === '1';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);

  const resolvedThemeColors = darkMode ? toDarkPalette(themeColors) : themeColors;

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
    let homepage = { ...DEFAULT_HOMEPAGE_CONFIG };
    let loyalty = { ...DEFAULT_LOYALTY_CONFIG };
    let features = { ...DEFAULT_FEATURES_CONFIG };
    let welcome = { ...DEFAULT_WELCOME_POPUP_CONFIG };
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
        }
        if (parsed && parsed.howItWorksConfig) {
          howItWorks = { ...DEFAULT_HOW_IT_WORKS_CONFIG, ...parsed.howItWorksConfig };
        }
        if (parsed && parsed.storeConfig) {
          store = { ...DEFAULT_STORE_CONFIG, ...parsed.storeConfig };
        }
        if (parsed && parsed.homepageConfig) {
          homepage = { ...DEFAULT_HOMEPAGE_CONFIG, ...parsed.homepageConfig };
        }
        // Backfill hero badges so old DB data without English translation
        // columns still shows English by falling back to the defaults.
        const defaultBadges = DEFAULT_HOMEPAGE_CONFIG.heroBadges.badges;
        homepage.heroBadges = {
          ...DEFAULT_HOMEPAGE_CONFIG.heroBadges,
          ...homepage.heroBadges,
          badges: (homepage.heroBadges.badges || []).map((b) => {
            const def = defaultBadges.find((d) => d.id === b.id);
            return def
              ? {
                  ...def,
                  ...b,
                  title: b.title || def.title,
                  title_en: b.title_en || def.title_en,
                  subtitle: b.subtitle || def.subtitle,
                  subtitle_en: b.subtitle_en || def.subtitle_en,
                }
              : b;
          }),
        };
        if (parsed && parsed.loyaltyConfig) {
          loyalty = { ...DEFAULT_LOYALTY_CONFIG, ...parsed.loyaltyConfig };
        }
        if (parsed && parsed.featuresConfig) {
          features = { ...DEFAULT_FEATURES_CONFIG, ...parsed.featuresConfig };
        }
        if (parsed && parsed.welcomeConfig) {
          welcome = { ...DEFAULT_WELCOME_POPUP_CONFIG, ...parsed.welcomeConfig };
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
    setHomepageConfig(homepage);
    setLoyaltyConfig(loyalty);
    setFeaturesConfig(features);
    setWelcomeConfig(welcome);
    setLoading(false);

    saveSettingsCache({
      settings: siteSettings,
      themeColors: colors,
      headerConfig: header,
      footerConfig: footer,
      paymentConfig: payment,
      heroConfig: hero,
      howItWorksConfig: howItWorks,
      storeConfig: store,
      homepageConfig: homepage,
      loyaltyConfig: loyalty,
      featuresConfig: features,
      welcomeConfig: welcome,
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('pharmacy-dark-mode', darkMode ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  useLayoutEffect(() => {
    if (settings) {
      const root = document.documentElement;
      // Set all custom CSS variables dynamically
      root.style.setProperty('--color-primary', resolvedThemeColors.primaryColor);
      root.style.setProperty('--color-secondary', resolvedThemeColors.secondaryColor);
      root.style.setProperty('--color-accent', resolvedThemeColors.accentColor);

      root.style.setProperty('--header-bg', resolvedThemeColors.headerBg);
      root.style.setProperty('--header-text', resolvedThemeColors.headerText);
      root.style.setProperty('--header-nav-bg', resolvedThemeColors.headerNavBg);
      root.style.setProperty('--header-nav-text', resolvedThemeColors.headerNavText);
      
      root.style.setProperty('--hero-bg-start', resolvedThemeColors.heroBgStart);
      root.style.setProperty('--hero-bg-middle', resolvedThemeColors.heroBgMiddle);
      root.style.setProperty('--hero-bg-end', resolvedThemeColors.heroBgEnd);
      root.style.setProperty('--hero-text', resolvedThemeColors.heroText);
      root.style.setProperty('--hero-btn-bg', resolvedThemeColors.heroBtnBg);
      root.style.setProperty('--hero-btn-text', resolvedThemeColors.heroBtnText);
      
      root.style.setProperty('--pharmacy-hover-border', resolvedThemeColors.pharmacyHoverBorder);
      
      root.style.setProperty('--footer-bg', resolvedThemeColors.footerBg);
      root.style.setProperty('--footer-text', resolvedThemeColors.footerText);
    }
  }, [settings, resolvedThemeColors]);

return (
    <SettingsContext.Provider
      value={{
        settings: settings || DEFAULT_SETTINGS,
        themeColors: resolvedThemeColors,
        headerConfig,
        footerConfig,
        paymentConfig,
        heroConfig,
        howItWorksConfig,
        storeConfig,
        homepageConfig,
        loyaltyConfig,
        featuresConfig,
        welcomeConfig,
        darkMode,
        toggleDarkMode: () => setDarkMode((v) => !v),
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
