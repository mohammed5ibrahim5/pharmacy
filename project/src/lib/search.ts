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
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ی/g, 'ي')
    .replace(/ک/g, 'ك')
    .replace(/[^a-z0-9\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SEARCH_FIELDS = [
  'name',
  'name_en',
  'active_ingredient',
  'manufacturer',
  'barcode',
  'description',
  'dosage',
  'form',
  'unit',
] as const;

const SEARCH_STOP_WORDS = new Set([
  'عايز', 'عاوزه', 'اريد', 'ابحث', 'عن', 'في', 'من', 'الى', 'لي', 'لل',
  'ال', 'دواء', 'ادويه', 'the', 'for', 'a', 'an', 'i', 'need', 'want',
  'medicine', 'drug',
]);

function queryTokens(query: string): string[] {
  const tokens = normalizeSearchText(query).split(' ');
  const prefixes = ['وال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك'];
  return [...new Set(tokens.map((token) => {
    const prefix = prefixes.find(
      (candidate) => token.startsWith(candidate) && token.length - candidate.length >= 3
    );
    return prefix ? token.slice(prefix.length) : token;
  }).filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token)))];
}

/**
 * Builds a safe PostgREST OR filter that fetches exact, token, and one-typo
 * candidates before the local relevance ranking runs.
 */
export function buildProductSearchOr(query: string): string {
  const normalized = normalizeSearchText(query);
  const tokens = queryTokens(query).slice(0, 6);
  const filters = new Set<string>();
  const add = (column: string, term: string) => {
    const safeTerm = term.replace(/[^a-z0-9\u0600-\u06FF_]/gi, '');
    if (safeTerm.length >= 2) filters.add(`${column}.ilike.%${safeTerm}%`);
  };

  if (normalized.length >= 2) {
    for (const field of SEARCH_FIELDS) add(field, normalized);
  }

  const originalTokens = query
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u0610-\u061A\u064B-\u065F\u0670\u0640]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06FF]+/)
    .filter(
      (token) =>
        token.length >= 2 &&
        !SEARCH_STOP_WORDS.has(normalizeSearchText(token))
    )
    .slice(0, 6);
  for (const token of [...new Set([...tokens, ...originalTokens])]) {
    const variants = new Set([token, normalizeSearchText(token)]);
    for (const prefix of ['وال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك']) {
      if (token.startsWith(prefix) && token.length - prefix.length >= 3) {
        variants.add(token.slice(prefix.length));
      }
    }
    for (const variant of variants) {
      for (const field of SEARCH_FIELDS) add(field, variant);
    }
  }

  const fuzzyTokens = tokens
    .filter((token) => token.length >= 5 && !/^\d+$/.test(token))
    .sort((a, b) => b.length - a.length)
    .slice(0, 2);
  for (const token of fuzzyTokens) {
    const variants = new Set<string>();
    for (let index = 0; index < token.length; index++) {
      variants.add(token.slice(0, index) + token.slice(index + 1));
      variants.add(`${token.slice(0, index)}_${token.slice(index + 1)}`);
      if (index + 1 < token.length) {
        variants.add(
          token.slice(0, index) +
          token[index + 1] +
          token[index] +
          token.slice(index + 2)
        );
      }
    }
    for (const variant of [...variants].slice(0, 24)) {
      add('name', variant);
      add('name_en', variant);
    }
  }

  return [...filters].join(',');
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

function tokenScore(queryToken: string, field: string): number {
  const normalizedField = normalizeSearchText(field);
  if (!normalizedField) return 0;
  if (normalizedField === queryToken) return 100;
  if (normalizedField.startsWith(queryToken)) return 88;
  if (normalizedField.includes(queryToken)) return 80;

  const words = normalizedField.split(' ');
  let best = 0;
  for (const word of words) {
    if (word === queryToken) best = Math.max(best, 96);
    else if (word.startsWith(queryToken)) best = Math.max(best, 86);
    else if (word.includes(queryToken)) best = Math.max(best, 76);
    else {
      const maxDistance = queryToken.length < 5 ? 1 : 2;
      const distance = levenshtein(queryToken, word);
      if (distance <= maxDistance) {
        best = Math.max(best, 64 - distance * 4);
      }
    }
  }
  return best;
}

export function smartSearch(
  query: string,
  options: SmartSearchOptions = {}
): SmartSearchResult[] {
  const q = (query || '').trim();
  const normalized = normalizeSearchText(q);
  const tokens = queryTokens(q);
  const products = options.products ?? [];
  const onlyAvailable = options.onlyAvailable ?? true;

  if (normalized.length < MIN_LEN) return [];

  const results: SmartSearchResult[] = [];

  for (const product of products) {
    if (onlyAvailable && !product.is_available) continue;

    const fields: Array<{ value: string; type: SmartSearchResult['matchType'] }> = [
      { value: product.name, type: 'exact' },
      { value: product.name_en || '', type: 'exact' },
      { value: product.active_ingredient || '', type: 'ingredient' },
      { value: product.manufacturer || '', type: 'exact' },
      { value: product.barcode || '', type: 'exact' },
      { value: product.description || '', type: 'exact' },
      { value: product.dosage || '', type: 'exact' },
      { value: product.form || '', type: 'exact' },
      { value: product.unit || '', type: 'exact' },
      { value: product.category?.name || '', type: 'exact' },
      { value: product.category?.name_en || '', type: 'exact' },
    ];
    const barcodeExact = normalizeSearchText(product.barcode || '') === normalized;
    const fullNameMatch = fields
      .filter((field) => field.type === 'exact' || field.type === 'ingredient')
      .some(({ value }) => normalizeSearchText(value) === normalized);
    const matchedScores = tokens.map((token) =>
      fields.reduce<{ score: number; type: SmartSearchResult['matchType'] }>(
        (best, field) => {
          const score = tokenScore(token, field.value);
          return score > best.score ? { score, type: field.type } : best;
        },
        { score: 0, type: 'exact' }
      )
    );
    const matchedCount = matchedScores.filter((match) => match.score > 0).length;
    const coverage = tokens.length === 0 ? 0 : matchedCount / tokens.length;
    const score = barcodeExact
      ? 100
      : fullNameMatch
        ? 100
        : matchedScores.reduce((total, match) => total + match.score, 0) / Math.max(tokens.length, 1);

    if (
      score >= 55 &&
      matchedCount > 0 &&
      (barcodeExact || fullNameMatch || coverage >= 0.5)
    ) {
      const strongest = matchedScores.reduce(
        (best, match) => match.score > best.score ? match : best,
        { score: 0, type: 'exact' as SmartSearchResult['matchType'] }
      );
      const typoMatch = strongest.score > 0 && strongest.score < 76;
      results.push({
        product: product as SmartSearchResult['product'],
        score: Math.round(score),
        matchType: strongest.type === 'ingredient'
          ? 'ingredient'
          : typoMatch
            ? 'fuzzy'
            : 'exact',
      });
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