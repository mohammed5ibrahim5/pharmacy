export const PHARMACY_SECTION_KEYS = ['highest_rated', 'most_popular', 'delivery', '24h'] as const;

export type PharmacySectionKey = (typeof PHARMACY_SECTION_KEYS)[number];

export const PHARMACY_SECTIONS_META: Record<PharmacySectionKey, { label: string; emptyLabel: string }> = {
  highest_rated: { label: 'الأعلى تقييماً', emptyLabel: 'غير متاح حالياً' },
  most_popular: { label: 'الأكثر شعبية', emptyLabel: 'غير متاح حالياً' },
  delivery: { label: 'توصيل سريع', emptyLabel: 'غير متاح حالياً' },
  '24h': { label: 'طوارئ 24/7', emptyLabel: 'غير متاح حالياً' },
};
