export interface Category {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  icon: string | null;
  sort_order?: number | null;
  created_at: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string;
  area: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  is_active: boolean;
  rating: number;
  delivery_available: boolean;
  delivery_fee: number;
  opening_hours: string | null;
  is_24h: boolean;
  has_parking: boolean;
  accept_insurance: boolean;
  website_url: string | null;
  pharmacy_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  pharmacy_id: string;
  category_id: string | null;
  name: string;
  name_en: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  unit: string;
  is_available: boolean;
  requires_prescription: boolean;
  active_ingredient: string | null;
  manufacturer: string | null;
  form: string | null;
  dosage: string | null;
  how_to_use: string | null;
  contraindications: string | null;
  interactions: string | null;
  stock_quantity: number;
  barcode: string | null;
  is_medical?: boolean;
  for_all_pharmacies?: boolean;
  created_at: string;
  updated_at: string;
  pharmacy?: Pharmacy;
  category?: Category;
  discounts?: Discount[];
}

export interface Discount {
  id: string;
  product_id: string;
  pharmacy_id: string;
  discount_percentage: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface HeaderConfig {
  showTopBar: boolean;
  showLocationBar: boolean;
  locationText: string;
  locationText_en: string | null;
  showServiceBar: boolean;
  serviceText: string;
  serviceText_en: string | null;
  showPrescriptionBar: boolean;
  prescriptionBarColor: string;
  topBarColor: string;
  topBarTextColor: string;
  showContactPhone: boolean;
  showVoiceSearch: boolean;
  showBarcode: boolean;
  showTrendingTags: boolean;
  trendingMode: 'auto' | 'manual';
  trendingKeywords: string[];
  showWhatsAppButton: boolean;
  showCategoryPills: boolean;
}

export interface FooterConfig {
  showNewsletter: boolean;
  newsletterTitle: string;
  newsletterTitle_en: string | null;
  newsletterSubtitle: string;
  newsletterSubtitle_en: string | null;
  newsletterButtonText: string;
  newsletterButtonText_en: string | null;
  newsletterInputPlaceholder: string;
  newsletterInputPlaceholder_en: string | null;
  newsletterSuccessText: string;
  newsletterSuccessText_en: string | null;
  newsletterBgStart: string;
  newsletterBgEnd: string;
  newsletterTextColor: string;
  newsletterBtnBg: string;
  newsletterBtnText: string;
  newsletterBgImage: string;
  showQuickLinks: boolean;
  quickLinksTitle: string;
  quickLinksTitle_en: string | null;
  showContactSection: boolean;
  contactTitle: string;
  contactTitle_en: string | null;
  showSocialSection: boolean;
  socialTitle: string;
  socialTitle_en: string | null;
  socialText: string;
  socialText_en: string | null;
  showTrustBadges: boolean;
  trustBadge1: string;
  trustBadge1_en: string | null;
  trustBadge2: string;
  trustBadge2_en: string | null;
  trustBadge3: string;
  trustBadge3_en: string | null;
  footerTagline: string;
  footerTagline_en: string | null;
  showCopyright: boolean;
  showBottomNotice: boolean;
  bottomNoticeText: string;
  bottomNoticeText_en: string | null;
}

export interface StoreConfig {
  purchasesEnabled: boolean;
  contactMessage: string;
  contactMessage_en: string | null;
  catalogWhatsapp: string;
  catalogMultiPharmacy: boolean;
}

export interface TrustSignalsConfig {
  showSection: boolean;
  showBottomBar: boolean;
  cards: {
    licensed: boolean;
    secure: boolean;
    pharmacists: boolean;
    fastDelivery: boolean;
    authentic: boolean;
    support: boolean;
  };
}

export interface HeroBadge {
  id: string;
  icon: string;
  title: string;
  title_en: string | null;
  subtitle: string;
  subtitle_en: string | null;
  color: string;
  enabled: boolean;
}

export interface HeroBadgesConfig {
  showBadges: boolean;
  badges: HeroBadge[];
}

export interface HomepageConfig {
  pharmaciesTitle: string;
  pharmaciesTitle_en: string | null;
  pharmaciesSubtitle: string;
  pharmaciesSubtitle_en: string | null;
  trust: TrustSignalsConfig;
  heroBadges: HeroBadgesConfig;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  site_name_en: string | null;
  site_tagline: string;
  site_tagline_en: string | null;
  site_description: string | null;
  site_description_en: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  contact_address: string | null;
  contact_address_en: string | null;
  footer_text: string;
  footer_text_en: string | null;
  hero_title: string;
  hero_title_en: string | null;
  hero_subtitle: string;
  hero_subtitle_en: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  about_title: string | null;
  about_title_en: string | null;
  about_text: string | null;
  about_text_en: string | null;
  features_json: string | null;
  announcement_text: string | null;
  announcement_text_en: string | null;
  announcement_active: boolean;
  headerConfig?: HeaderConfig;
  created_at: string;
  updated_at: string;
}

export interface PharmacyWithDistance extends Pharmacy {
  distance?: number;
}

export interface PharmacyOwner {
  id: string;
  pharmacy_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  pharmacy_id: string;
  customer_id: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  order_id?: string | null;
  delivery_rating?: number | null;
  product_quality_rating?: number | null;
  value_rating?: number | null;
  is_visible?: boolean;
  sort_order?: number;
  pharmacy?: { name?: string | null; is_active?: boolean | null } | null;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  points: number;
  reason: string;
  created_at: string;
}

export interface StockAlert {
  id: string;
  customer_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface MedicationReminder {
  id: string;
  name: string;
  dosage: string;
  time: string;
  days: number[];
  note: string;
  refillDate?: string | null;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  customer_id: string;
  name: string;
  relation: string | null;
  age: number | null;
  weight: number | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface HeroConfig {
  showSearch: boolean;
  showTrending: boolean;
  showPrescriptionButton: boolean;
  showLocationButton: boolean;
  searchPlaceholder: string;
  searchPlaceholder_en: string | null;
  prescriptionButtonText: string;
  prescriptionButtonText_en: string | null;
  locationButtonText: string;
  locationButtonText_en: string | null;
  locationSetText: string;
  locationSetText_en: string | null;
  trendingLabel: string;
  trendingLabel_en: string | null;
  trendingKeywords: string[];
}

export interface HowItWorksStep {
  title: string;
  title_en: string | null;
  desc: string;
  desc_en: string | null;
}

export interface HowItWorksConfig {
  enabled: boolean;
  badge: string;
  badge_en: string | null;
  title: string;
  title_en: string | null;
  subtitle: string;
  subtitle_en: string | null;
  steps: HowItWorksStep[];
}

export interface HomepageSection {
  id: string;
  section_key: string;
  badge: string;
  title: string;
  title_alt: string | null;
  subtitle: string | null;
  section_type: 'nearest' | 'highest_rated' | 'most_popular' | 'delivery' | 'is_24h' | 'insurance' | 'parking';
  is_active: boolean;
  sort_order: number;
  badge_color: string;
  bg_style: 'gray' | 'white';
  item_limit: number;
  created_at: string;
  updated_at: string;
}
