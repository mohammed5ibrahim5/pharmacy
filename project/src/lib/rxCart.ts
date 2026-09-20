import { supabase } from '@/lib/supabase';
import { matchDrugNames, extractDosage, normalizeDigits, normalizeArabic } from '@/lib/ocr';
import type { Product } from '@/types';

// ============================================================
// تحويل الروشتة المعترف بها (OCR) إلى سلة جاهزة للتأكيد
// ============================================================

export interface RxCartLine {
  key: string;
  name: string;
  dosage?: string;
  qty: number;
  product?: Product;
  matched: boolean;
  available: boolean;
  /** مُختارة للإضافة للسلة — افتراضياً كل المتوفر */
  selected: boolean;
}

const PRODUCT_SELECT = '*, pharmacy:pharmacies(*), category:categories(*), discounts(*)';

/** كتالوج مطابقة الـ OCR — كل المنتجات ليس للتوفر فقط لكن لمعرفة ما هو خارج المخزون أيضاً */
export async function fetchRxCatalogProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .limit(2000)
    .order('name');
  return (data || []) as Product[];
}

/** حجمان أقصى لمرة واحدة — كافٍ لتغطية كتالوج صيدلية نموذجي */

/** استخراج كمية تقريبية من سطر الروشتة: (2) ، 2× ، ×3 ، "علبتين/٣ علب" */
export function extractDrugQty(line: string): number {
  const n = normalizeDigits(line).replace(/[٠-٩۰-۹]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  let m = n.match(/\((\d{1,2})\)/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 20) return Number(m[1]);
  m = n.match(/[x×*]\s*(\d{1,2})/i);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 20) return Number(m[1]);
  m = n.match(/^(\d{1,2})\s*[x×*]/i);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 20) return Number(m[1]);
  m = n.match(/(\d{1,2})\s*(?:علبة|عبوة|كارتون|زجاجة|كيس|كيسة|شريط|قرص)/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 20) return Number(m[1]);
  m = n.match(/علبتين?|عبوتين?/);
  if (m) return m[0].includes('ين') ? 2 : 1;
  return 1;
}

/**
 * بناء خطوط السلة من ناتج OCR (نص خام) مقابل كتالوج المنتجات.
 * يرجع السطور المتطابقة فقط — ما لم يُتعرف عليه يظهر للمستخدم للبحث اليدوي.
 */
export function buildRxCart(rawText: string, products: Product[]): RxCartLine[] {
  if (!rawText || !rawText.trim() || products.length === 0) return [];
  const names = products.map((p) => p.name);
  const matched = matchDrugNames(rawText, names);

  const byName = new Map<string, Product>();
  for (const p of products) {
    const key = normalizeArabic(p.name);
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, p);
  }

  const seen = new Set<string>();
  return matched
    .map((item): RxCartLine | null => {
      const product = byName.get(normalizeArabic(item.name));
      if (!product || seen.has(product.id)) return null;
      seen.add(product.id);
      const dosage = extractDosage(item.block);
      return {
        key: `rx:${product.id}`,
        name: product.name,
        dosage: dosage || product.dosage || undefined,
        qty: extractDrugQty(item.block),
        product,
        matched: true,
        available: product.is_available && (product.stock_quantity ?? 0) > 0,
        selected: true,
      };
    })
    .filter((l): l is RxCartLine => l !== null);
}

/** بحث يدوي في الكتالوج لإضافة دواء لم يلتقطه الـ OCR */
export async function searchRxProducts(query: string): Promise<Product[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .or(`name.ilike.%${q}%,name_en.ilike.%${q}%,active_ingredient.ilike.%${q}%`)
    .eq('is_available', true)
    .limit(12)
    .order('name');
  return (data || []) as Product[];
}

/** البحث عن منتج برقم الباركود الممسوح — أو null إن لم يوجد */
export async function lookupProductByBarcode(code: string): Promise<Product | null> {
  const barcode = code.trim();
  if (!barcode) return null;
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('barcode', barcode)
    .limit(1)
    .maybeSingle();
  return (data as Product | null) || null;
}