import { calculateDistance } from '@/hooks/useGeolocation';
import type { Product } from '@/types';

export interface SmartSearchResult {
  product: Product & { pharmacy_name?: string };
  score: number;
  matchType: 'exact' | 'fuzzy' | 'alternative' | 'reorder' | 'ingredient';
}

/** Normalize Arabic + Latin text for lenient matching: strips diacritics,
 *  normalizes alef/hamza/tah marbutah/alef maqsura, lowercases, trims. */
export function normalizeSearchText(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^a-z0-9\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Small Levenshtein-distance implementation used for typo correction. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array<number>(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

const MIN_LEN = 2;

export interface SmartSearchOptions {
  /** Products to search within; if omitted they are fetched from Supabase. */
  products?: Product[];
  /** Whether to only return available products (default true). */
  onlyAvailable?: boolean;
  /** Previous purchases (product ids) used for "reorder" suggestions. */
  previousOrderedProductIds?: string[];
  /** Current cart product ids used to exclude duplicates from reorder suggestions. */
  cartProductIds?: string[];
}

export interface NearPharmacyResult {
  pharmacy: {
    id: string;
    name: string;
    distance?: number;
  };
  productId: string;
  price: number;
}

function distanceScore(query: string, field: string): number {
  if (!field) return 0;
  const nq = normalizeSearchText(query);
  const nf = normalizeSearchText(field);
  if (!nf) return 0;
  if (nf === nq) return 100;
  if (nf.startsWith(nq)) return 80;
  if (nf.includes(nq)) return 70;
  // typo tolerance: short queries allow dist 1, longer allow dist 2
  const maxDist = nq.length <= 4 ? 1 : 2;
  const dist = levenshtein(nq, nf.slice(0, nq.length + 2));
  if (dist <= maxDist) return 55;
  return 0;
}

function ingredientScore(query: string, p: Product): number {
  const nq = normalizeSearchText(query);
  const ing = normalizeSearchText(p.active_ingredient || '');
  if (!ing) return 0;
  if (ing === nq) return 85;
  if (ing.includes(nq) || nq.includes(ing)) return 75;
  return 0;
}

export function smartSearch(
  query: string,
  options: SmartSearchOptions = {}
): SmartSearchResult[] {
  const q = (query || '').trim();
  const normalized = normalizeSearchText(q);
  const products = options.products ?? [];
  const onlyAvailable = options.onlyAvailable ?? true;

  if (normalized.length < MIN_LEN) return [];

  const results: SmartSearchResult[] = [];

  for (const product of products) {
    if (onlyAvailable && !product.is_available) continue;

    let best: Omit<SmartSearchResult, 'product'> | null = null;

    const nameScore = distanceScore(q, product.name);
    const nameEnScore = distanceScore(q, product.name_en || '');
    const ingScore = ingredientScore(q, product);
    const descScore = distanceScore(q, product.description || '') * 0.6;
    const manuScore = distanceScore(q, product.manufacturer || '') * 0.5;
    const barcodeScore = product.barcode === q ? 100 : distanceScore(q, product.barcode || '') * 0.5;

    const candidates: Array<{ score: number; matchType: SmartSearchResult['matchType'] }> = [
      { score: nameScore, matchType: 'exact' },
      { score: nameEnScore, matchType: 'exact' },
      { score: ingScore, matchType: 'ingredient' },
      { score: descScore, matchType: 'exact' },
      { score: manuScore, matchType: 'exact' },
      { score: barcodeScore, matchType: 'exact' },
    ];

    best = candidates.reduce<Omit<SmartSearchResult, 'product'> | null>(
      (acc, c) => (!acc || c.score > acc.score ? c : acc),
      null
    );

    if (best && best.score >= 55 && best.score > 0) {
      results.push({ product: product as SmartSearchResult['product'], ...best });
    }
  }

  // Keep the global ordering deterministic, then the reorder + alternative flags on top
  const sorted = results.sort((a, b) => b.score - a.score);

  // Reorder suggestions: products previously ordered that match (or are top matches)
  if (options.previousOrderedProductIds && options.previousOrderedProductIds.length > 0) {
    for (const r of sorted) {
      if (options.previousOrderedProductIds.includes(r.product.id)) {
        r.matchType = 'reorder';
        r.score += 5;
      }
    }
  }

  // Cheaper alternative suggestions: among the same ingredient, promote cheaper ones
  const ingGroups = new Map<string, SmartSearchResult[]>();
  for (const r of sorted) {
    const ing = normalizeSearchText(r.product.active_ingredient || '');
    if (!ing) continue;
    const list = ingGroups.get(ing) ?? [];
    list.push(r);
    ingGroups.set(ing, list);
  }
  for (const [, list] of ingGroups) {
    if (list.length > 1) {
      const minPrice = Math.min(...list.map((r) => r.product.price));
      for (const r of list) {
        if (r.product.price > minPrice) {
          r.score += 2;
          r.matchType = r.matchType === 'reorder' ? r.matchType : 'alternative';
        }
      }
    }
  }

  sorted.sort((a, b) => b.score - a.score);
  return sorted;
}

/** Cheap alternative suggestions for a given product from the same ingredient. */
export function findCheaperAlternatives(
  product: Product,
  products: Product[]
): Product[] {
  const ing = normalizeSearchText(product.active_ingredient || '');
  if (!ing) return [];
  return products
    .filter(
      (p) =>
        p.id !== product.id &&
        p.is_available &&
        normalizeSearchText(p.active_ingredient || '') === ing &&
        p.price < product.price
    )
    .sort((a, b) => a.price - b.price);
}

export { calculateDistance };