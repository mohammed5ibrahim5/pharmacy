import { supabase } from '@/lib/supabase';

export interface DoseForm {
  id: string;
  labelAr: string;
  mgPer5ml?: number;
  mgPerMl?: number;
}

export interface DoseRule {
  key: string;
  nameAr: string;
  nameEn: string;
  basis: 'perDose' | 'perDay';
  low: number;
  high: number;
  perDay: number;
  intervalH: number;
  minAgeMonths: number;
  maxDailyMgPerKg?: number;
  maxSingleMg?: number;
  note?: string;
  forms: DoseForm[];
}

interface DbRow {
  key: string;
  name_ar: string;
  name_en: string;
  basis: string;
  low: number;
  high: number;
  per_day: number;
  interval_h: number;
  min_age_months: number;
  max_daily_mg_per_kg: number | null;
  max_single_mg: number | null;
  note: string | null;
  forms: DoseForm[] | null;
}

/** Built-in rules used when the database has no entry for a medicine */
export const DEFAULT_DOSE_RULES: DoseRule[] = [
  {
    key: 'paracetamol',
    nameAr: 'باراسيتامول',
    nameEn: 'Paracetamol',
    basis: 'perDose',
    low: 10,
    high: 15,
    perDay: 4,
    intervalH: 6,
    minAgeMonths: 3,
    maxDailyMgPerKg: 60,
    note: 'كل 4-6 ساعات',
    forms: [
      { id: '120/5', labelAr: 'شراب 120 مجم/5 مل', mgPer5ml: 120 },
      { id: '250/5', labelAr: 'شراب 250 مجم/5 مل', mgPer5ml: 250 },
    ],
  },
  {
    key: 'ibuprofen',
    nameAr: 'إيبوبروفين',
    nameEn: 'Ibuprofen',
    basis: 'perDose',
    low: 5,
    high: 10,
    perDay: 3,
    intervalH: 8,
    minAgeMonths: 6,
    maxDailyMgPerKg: 30,
    note: 'كل 6-8 ساعات بعد الأكل',
    forms: [{ id: '100/5', labelAr: 'شراب 100 مجم/5 مل', mgPer5ml: 100 }],
  },
  {
    key: 'amoxicillin',
    nameAr: 'أموكسيسيلين',
    nameEn: 'Amoxicillin',
    basis: 'perDay',
    low: 20,
    high: 40,
    perDay: 3,
    intervalH: 8,
    minAgeMonths: 0,
    note: 'بوصفة طبية فقط',
    forms: [
      { id: '125/5', labelAr: 'شراب 125 مجم/5 مل', mgPer5ml: 125 },
      { id: '250/5', labelAr: 'شراب 250 مجم/5 مل', mgPer5ml: 250 },
    ],
  },
  {
    key: 'azithromycin',
    nameAr: 'أزيثروميسين',
    nameEn: 'Azithromycin',
    basis: 'perDay',
    low: 10,
    high: 10,
    perDay: 1,
    intervalH: 24,
    minAgeMonths: 6,
    note: 'جرعة واحدة يومياً لمدة 3 أيام',
    forms: [{ id: '200/5', labelAr: 'شراب 200 مجم/5 مل', mgPer5ml: 200 }],
  },
  {
    key: 'cetirizine',
    nameAr: 'سيتريزين (مضاد حساسية)',
    nameEn: 'Cetirizine',
    basis: 'perDay',
    low: 0.25,
    high: 0.25,
    perDay: 1,
    intervalH: 24,
    minAgeMonths: 24,
    maxSingleMg: 10,
    note: 'جرعة واحدة يومياً',
    forms: [
      { id: 'drops', labelAr: 'نقط 10 مجم/مل', mgPerMl: 10 },
      { id: '5/5', labelAr: 'شراب 5 مجم/5 مل', mgPer5ml: 5 },
    ],
  },
];

function rowToRule(row: DbRow): DoseRule {
  return {
    key: row.key,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    basis: row.basis === 'perDay' ? 'perDay' : 'perDose',
    low: Number(row.low),
    high: Number(row.high),
    perDay: row.per_day,
    intervalH: row.interval_h,
    minAgeMonths: row.min_age_months,
    maxDailyMgPerKg: row.max_daily_mg_per_kg ?? undefined,
    maxSingleMg: row.max_single_mg ?? undefined,
    note: row.note ?? undefined,
    forms: Array.isArray(row.forms) ? row.forms : [],
  };
}

/**
 * Returns dose rules merged from the database over the built-in defaults.
 * DB entries override defaults sharing the same key; new entries are appended.
 * Falls back to defaults only if the table does not exist / query fails.
 */
export async function fetchDoseRules(): Promise<{ rules: DoseRule[]; fromDb: boolean }> {
  try {
    const { data, error } = await supabase.from('medicine_dose_rules').select('*').order('name_ar');
    if (error || !data) return { rules: DEFAULT_DOSE_RULES, fromDb: false };
    const dbRules = (data as DbRow[]).map(rowToRule);
    const merged = [...DEFAULT_DOSE_RULES.map((d) => dbRules.find((r) => r.key === d.key) ?? d)];
    for (const r of dbRules) {
      if (!merged.some((m) => m.key === r.key)) merged.push(r);
    }
    return { rules: merged, fromDb: true };
  } catch {
    return { rules: DEFAULT_DOSE_RULES, fromDb: false };
  }
}
