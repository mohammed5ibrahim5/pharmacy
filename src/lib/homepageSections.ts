import type { HomepageSection, Pharmacy, SiteSettings } from '@/types';
import { getPharmacyWithDistance, sortPharmaciesByDistance } from '@/lib/distance';

export type SectionType = HomepageSection['section_type'];

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  nearest: 'أقرب الصيدليات (حسب الموقع)',
  highest_rated: 'الأعلى تقييماً',
  most_popular: 'الأكثر شعبية (حسب الطلبات)',
  delivery: 'صيدليات التوصيل',
  is_24h: 'صيدليات 24 ساعة',
  insurance: 'صيدليات التأمين',
  parking: 'صيدليات بمواقف سيارات',
};

export const BADGE_COLOR_OPTIONS = [
  { value: 'primary', label: 'اللون الأساسي' },
  { value: 'secondary', label: 'اللون الثانوي' },
  { value: 'accent', label: 'لون التمييز' },
  { value: 'green', label: 'أخضر' },
];

export const DEFAULT_HOMEPAGE_SECTIONS: Omit<HomepageSection, 'id' | 'created_at' | 'updated_at'>[] = [
  { section_key: 'nearest', badge: 'الأقرب إليك', title: 'أقرب الصيدليات إليك', title_alt: 'الصيدليات', subtitle: 'مرتبة حسب المسافة من موقعك', section_type: 'nearest', is_active: true, sort_order: 1, badge_color: 'primary', bg_style: 'gray', item_limit: 6 },
  { section_key: 'highest_rated', badge: 'الأعلى تقييماً', title: 'أفضل الصيدليات تقييماً', title_alt: null, subtitle: 'صيدليات حصلت على أعلى تقييمات من عملائنا', section_type: 'highest_rated', is_active: true, sort_order: 2, badge_color: 'accent', bg_style: 'white', item_limit: 6 },
  { section_key: 'most_popular', badge: 'الأكثر شعبية', title: 'أشهر الصيدليات', title_alt: null, subtitle: 'الصيدليات الأكثر طلباً من عملائنا', section_type: 'most_popular', is_active: true, sort_order: 3, badge_color: 'secondary', bg_style: 'gray', item_limit: 6 },
  { section_key: 'delivery', badge: 'توصيل سريع', title: 'صيدليات التوصيل', title_alt: null, subtitle: 'اطلب دوائك واستلمه لباب البيت', section_type: 'delivery', is_active: true, sort_order: 4, badge_color: 'green', bg_style: 'white', item_limit: 6 },
  { section_key: 'is_24h', badge: 'متاحة دائماً', title: 'صيدليات 24 ساعة', title_alt: null, subtitle: 'صيدليات تعمل على مدار الساعة', section_type: 'is_24h', is_active: true, sort_order: 5, badge_color: 'primary', bg_style: 'gray', item_limit: 6 },
];

export function resolveBadgeColor(colorKey: string, settings: SiteSettings): string {
  const presets: Record<string, string> = {
    primary: settings.primary_color,
    secondary: settings.secondary_color,
    accent: settings.accent_color,
    green: '#0d9488',
  };
  return presets[colorKey] || colorKey || settings.primary_color;
}

export function getSectionClassName(bgStyle: string): string {
  return bgStyle === 'gray' ? 'bg-gradient-to-b from-gray-50 to-white py-14' : 'py-14';
}

export function getPharmaciesForSection(
  section: HomepageSection,
  pharmacies: Pharmacy[],
  orderCounts: Record<string, number>,
  userLat?: number,
  userLng?: number
): (Pharmacy & { distance?: number })[] {
  const limit = section.item_limit || 6;

  switch (section.section_type) {
    case 'nearest': {
      const withDistance = pharmacies.map((p) => getPharmacyWithDistance(p, userLat, userLng));
      return sortPharmaciesByDistance(withDistance).slice(0, limit);
    }
    case 'highest_rated':
      return [...pharmacies].sort((a, b) => b.rating - a.rating).slice(0, limit);
    case 'most_popular':
      return [...pharmacies]
        .sort((a, b) => (orderCounts[b.id] || 0) - (orderCounts[a.id] || 0))
        .slice(0, limit);
    case 'delivery':
      return pharmacies.filter((p) => p.delivery_available).slice(0, limit);
    case 'is_24h':
      return pharmacies.filter((p) => p.is_24h).slice(0, limit);
    case 'insurance':
      return pharmacies.filter((p) => p.accept_insurance).slice(0, limit);
    case 'parking':
      return pharmacies.filter((p) => p.has_parking).slice(0, limit);
    default:
      return [];
  }
}

export function getSectionTitle(section: HomepageSection, hasLocation: boolean): string {
  if (section.section_type === 'nearest' && !hasLocation && section.title_alt) {
    return section.title_alt;
  }
  return section.title;
}

export function getSectionSubtitle(section: HomepageSection, hasLocation: boolean): string | undefined {
  if (section.section_type === 'nearest' && !hasLocation) {
    return undefined;
  }
  return section.subtitle || undefined;
}
