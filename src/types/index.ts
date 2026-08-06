export interface Category {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  icon: string | null;
  created_at: string;
}

export interface Pharmacy {
  id: string;
  name: string;
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
  stock_quantity: number;
  barcode: string | null;
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
  showLocationBar: boolean;
  locationText: string;
  showServiceBar: boolean;
  serviceText: string;
  showPrescriptionBar: boolean;
  prescriptionBarColor: string;
  topBarColor: string;
  topBarTextColor: string;
  showVoiceSearch: boolean;
  showBarcode: boolean;
  showTrendingTags: boolean;
  showWhatsAppButton: boolean;
  showCategoryPills: boolean;
}

export interface FooterConfig {
  showNewsletter: boolean;
  newsletterTitle: string;
  newsletterSubtitle: string;
  newsletterButtonText: string;
  showQuickLinks: boolean;
  quickLinksTitle: string;
  showContactSection: boolean;
  contactTitle: string;
  showSocialSection: boolean;
  socialTitle: string;
  socialText: string;
  showTrustBadges: boolean;
  footerTagline: string;
  showCopyright: boolean;
  showBottomNotice: boolean;
  bottomNoticeText: string;
}

export interface StoreConfig {
  purchasesEnabled: boolean;
  contactMessage: string;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  site_tagline: string;
  site_description: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  contact_address: string | null;
  footer_text: string;
  hero_title: string;
  hero_subtitle: string;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  about_title: string | null;
  about_text: string | null;
  features_json: string | null;
  announcement_text: string | null;
  announcement_active: boolean;
  headerConfig?: HeaderConfig;
  created_at: string;
  updated_at: string;
}

export interface PharmacyWithDistance extends Pharmacy {
  distance?: number;
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

export interface HeroStat {
  id: string;
  value: string;
  sub: string;
  desc: string;
  icon: string;
}

export interface HeroConfig {
  showSearch: boolean;
  showTrending: boolean;
  showStats: boolean;
  showPrescriptionButton: boolean;
  showLocationButton: boolean;
  searchPlaceholder: string;
  prescriptionButtonText: string;
  locationButtonText: string;
  locationSetText: string;
  trendingLabel: string;
  trendingKeywords: string[];
  stats: HeroStat[];
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
