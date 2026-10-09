import {
  Pill,
  Shield,
  Sparkles,
  Stethoscope,
  Heart,
  Droplet,
  Baby,
  Activity,
  Brain,
  Bone,
  Eye,
  Thermometer,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '@/types';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  pill: Pill,
  shield: Shield,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  heart: Heart,
  droplet: Droplet,
  baby: Baby,
  activity: Activity,
  brain: Brain,
  bone: Bone,
  eye: Eye,
  thermometer: Thermometer,
  heartpulse: HeartPulse,
};

export const CATEGORY_COLOR_MAP: Record<string, string> = {
  painkillers: '#0d9488',
  antibiotics: '#2563eb',
  supplements: '#d97706',
  'cold-flu': '#dc2626',
  vitamins: '#7c3aed',
  'skin-care': '#db2777',
  'baby-care': '#e11d48',
  digestive: '#16a34a',
  'mental-health': '#8b5cf6',
  orthopedic: '#64748b',
  ophthalmology: '#06b6d4',
  general: '#10b981',
};

export const CATEGORY_GRADIENTS: Record<string, string> = {
  painkillers: 'linear-gradient(135deg, #0d9488, #059669)',
  antibiotics: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  supplements: 'linear-gradient(135deg, #f59e0b, #f97316)',
  'cold-flu': 'linear-gradient(135deg, #ef4444, #f43f5e)',
  vitamins: 'linear-gradient(135deg, #a855f7, #7c3aed)',
  'skin-care': 'linear-gradient(135deg, #ec4899, #d946ef)',
  'baby-care': 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  digestive: 'linear-gradient(135deg, #22c55e, #14b8a6)',
  'mental-health': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  orthopedic: 'linear-gradient(135deg, #64748b, #475569)',
  ophthalmology: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
  general: 'linear-gradient(135deg, #10b981, #0d9488)',
};

const FALLBACK_COLORS = [
  '#0d9488', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#db2777',
  '#16a34a', '#0891b2', '#4f46e5', '#ea580c', '#059669', '#e11d48',
];

const FALLBACK_ICONS: LucideIcon[] = [
  Pill, Shield, Sparkles, Stethoscope, Heart, Droplet, Baby, Activity, Brain, Bone, Eye, Thermometer,
];

export const CATEGORY_PRIORITY: Record<string, number> = {
  painkillers: 1,
  'cold-flu': 2,
  antibiotics: 3,
  vitamins: 4,
  supplements: 5,
  digestive: 6,
  'skin-care': 7,
  'baby-care': 8,
  ophthalmology: 9,
  orthopedic: 10,
  'mental-health': 11,
  general: 12,
};

export function orderedCategories(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.slug] ?? 100;
    const pb = CATEGORY_PRIORITY[b.slug] ?? 100;
    if (pa !== pb) return pa - pb;
    return (a.name || '').localeCompare(b.name || '', 'ar');
  });
}

export interface KnownCategory {
  slug: string;
  name: string;
  name_en: string;
  icon: string;
}

export const KNOWN_CATEGORIES: KnownCategory[] = [
  { slug: 'painkillers', name: 'مسكنات الألم', name_en: 'Pain Relievers', icon: 'pill' },
  { slug: 'antibiotics', name: 'مضادات حيوية', name_en: 'Antibiotics', icon: 'shield' },
  { slug: 'supplements', name: 'مكملات غذائية', name_en: 'Supplements', icon: 'sparkles' },
  { slug: 'cold-flu', name: 'برد وإنفلونزا', name_en: 'Cold & Flu', icon: 'stethoscope' },
  { slug: 'vitamins', name: 'فيتامينات', name_en: 'Vitamins', icon: 'heart' },
  { slug: 'skin-care', name: 'العناية بالبشرة', name_en: 'Skin Care', icon: 'droplet' },
  { slug: 'baby-care', name: 'مستلزمات الأطفال', name_en: 'Baby Care', icon: 'baby' },
  { slug: 'digestive', name: 'الجهاز الهضمي', name_en: 'Digestive Health', icon: 'activity' },
  { slug: 'mental-health', name: 'الصحة النفسية', name_en: 'Mental Health', icon: 'brain' },
  { slug: 'orthopedic', name: 'العظام والمفاصل', name_en: 'Orthopedics', icon: 'bone' },
  { slug: 'ophthalmology', name: 'طب العيون', name_en: 'Ophthalmology', icon: 'eye' },
  { slug: 'general', name: 'طب عام', name_en: 'General Medicine', icon: 'stethoscope' },
];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function categoryColor(slug: string): string {
  const known = CATEGORY_COLOR_MAP[slug];
  if (known) return known;
  return FALLBACK_COLORS[hashCode(slug) % FALLBACK_COLORS.length];
}

export function categoryGradient(slug: string): string {
  const known = CATEGORY_GRADIENTS[slug];
  if (known) return known;
  const c = categoryColor(slug);
  return `linear-gradient(135deg, ${c}, ${c}bb)`;
}

export function categoryIcon(slug: string, icon?: string | null): LucideIcon {
  if (icon && CATEGORY_ICON_MAP[icon]) return CATEGORY_ICON_MAP[icon];
  return FALLBACK_ICONS[hashCode(slug || '') % FALLBACK_ICONS.length];
}

function knownToCategory(k: KnownCategory, index: number): Category {
  return {
    id: `known-${k.slug}`,
    name: k.name,
    name_en: k.name_en,
    slug: k.slug,
    icon: k.icon,
    sort_order: 1000 + index,
    created_at: new Date(0).toISOString(),
  };
}

export function mergeCategories(dbCategories: Category[]): Category[] {
  if (dbCategories.length === 0) {
    return KNOWN_CATEGORIES.map(knownToCategory);
  }
  const dbSlugs = new Set(dbCategories.map((c) => c.slug));
  const extras: Category[] = [];
  KNOWN_CATEGORIES.forEach((k) => {
    if (!dbSlugs.has(k.slug)) extras.push(knownToCategory(k, extras.length));
  });
  return [...dbCategories, ...extras];
}
