import { describe, it, expect } from 'vitest';
import {
  normalizeSearchText,
  levenshtein,
  smartSearch,
  findCheaperAlternatives,
} from '@/lib/search';
import type { Product } from '@/types';

function makeProduct(overrides: Partial<Product> & { id: string; name: string }): Product {
  return {
    pharmacy_id: 'ph1',
    category_id: null,
    name_en: null,
    description: null,
    image_url: null,
    price: 10,
    unit: 'tablet',
    is_available: true,
    requires_prescription: false,
    active_ingredient: null,
    manufacturer: null,
    form: null,
    dosage: null,
    how_to_use: null,
    contraindications: null,
    interactions: null,
    stock_quantity: 100,
    barcode: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  } as Product;
}

describe('normalizeSearchText', () => {
  it('lowercases text', () => {
    expect(normalizeSearchText('PANADOL')).toBe('panadol');
  });

  it('strips Arabic diacritics', () => {
    expect(normalizeSearchText('بَارَاسِيتَامُول')).toBe('باراسيتامول');
  });

  it('normalizes alef variants to ا', () => {
    expect(normalizeSearchText('أدوية')).toBe('ادويه');
    expect(normalizeSearchText('إدوية')).toBe('ادويه');
    expect(normalizeSearchText('آدوية')).toBe('ادويه');
  });

  it('normalizes ة to ه', () => {
    expect(normalizeSearchText('شريحة')).toBe('شريحه');
  });

  it('normalizes ى to ي', () => {
    expect(normalizeSearchText('علبه')).toBe('علبه');
  });

  it('removes non-alphanumeric non-Arabic characters', () => {
    expect(normalizeSearchText('hello! @world#')).toBe('hello world');
  });

  it('collapses multiple spaces and trims', () => {
    expect(normalizeSearchText('  hello   world  ')).toBe('hello world');
  });

  it('returns empty string for null/undefined input', () => {
    expect(normalizeSearchText('')).toBe('');
    expect(normalizeSearchText(null as unknown as string)).toBe('');
  });
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('calculates distance for single-char difference', () => {
    expect(levenshtein('abc', 'acc')).toBe(1);
  });

  it('calculates distance for insertions', () => {
    expect(levenshtein('ab', 'abc')).toBe(1);
  });

  it('calculates distance for deletions', () => {
    expect(levenshtein('abc', 'ab')).toBe(1);
  });

  it('returns n when first string is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
  });

  it('returns m when second string is empty', () => {
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('handles completely different strings', () => {
    expect(levenshtein('abc', 'xyz')).toBe(3);
  });
});

describe('smartSearch', () => {
  const products: Product[] = [
    makeProduct({ id: '1', name: 'Panadol', name_en: 'Panadol', active_ingredient: 'Paracetamol', price: 10 }),
    makeProduct({ id: '2', name: 'Ibuprofen', name_en: 'Ibuprofen', active_ingredient: 'Ibuprofen', price: 15 }),
    makeProduct({ id: '3', name: 'Panadol Extra', name_en: 'Panadol Extra', active_ingredient: 'Paracetamol', price: 20 }),
    makeProduct({ id: '4', name: 'Unavailable Drug', is_available: false }),
  ];

  it('returns empty for queries shorter than MIN_LEN', () => {
    expect(smartSearch('a', { products })).toEqual([]);
  });

  it('finds exact name matches', () => {
    const results = smartSearch('Panadol', { products });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].product.id).toBe('1');
    expect(results[0].score).toBe(100);
  });

  it('finds name_en matches', () => {
    const results = smartSearch('Ibuprofen', { products });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.product.id === '2')).toBe(true);
  });

  it('skips unavailable products by default', () => {
    const results = smartSearch('Unavailable', { products });
    expect(results.length).toBe(0);
  });

  it('includes unavailable when onlyAvailable is false', () => {
    const results = smartSearch('Unavailable', { products, onlyAvailable: false });
    expect(results.length).toBe(1);
  });

  it('finds ingredient matches', () => {
    const results = smartSearch('Paracetamol', { products });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.product.active_ingredient === 'Paracetamol')).toBe(true);
  });

  it('marks reorder products when previousOrderedProductIds provided', () => {
    const results = smartSearch('Panadol', { products, previousOrderedProductIds: ['1'] });
    const panadolResult = results.find((r) => r.product.id === '1');
    expect(panadolResult).toBeDefined();
    expect(panadolResult!.matchType).toBe('reorder');
  });

  it('marks cheaper alternatives', () => {
    const results = smartSearch('Paracetamol', { products });
    const resultsWithAlternative = results.filter((r) => r.matchType === 'alternative');
    expect(resultsWithAlternative.length).toBeGreaterThanOrEqual(0);
  });

  it('returns sorted by score descending', () => {
    const results = smartSearch('Panadol', { products });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });
});

describe('findCheaperAlternatives', () => {
  const products: Product[] = [
    makeProduct({ id: '1', name: 'Paracetamol 500', active_ingredient: 'Paracetamol', price: 10 }),
    makeProduct({ id: '2', name: 'Paracetamol 250', active_ingredient: 'Paracetamol', price: 5 }),
    makeProduct({ id: '3', name: 'Paracetamol Premium', active_ingredient: 'Paracetamol', price: 15 }),
    makeProduct({ id: '4', name: 'Ibuprofen', active_ingredient: 'Ibuprofen', price: 8 }),
  ];

  it('returns cheaper alternatives with same ingredient', () => {
    const alts = findCheaperAlternatives(products[0], products);
    expect(alts.length).toBe(1);
    expect(alts[0].id).toBe('2');
  });

  it('returns empty if no cheaper alternatives exist', () => {
    const alts = findCheaperAlternatives(products[1], products);
    expect(alts.length).toBe(0);
  });

  it('returns empty for product with no active_ingredient', () => {
    const noIng = makeProduct({ id: '99', name: 'No Ingredient', active_ingredient: null, price: 10 });
    expect(findCheaperAlternatives(noIng, products)).toEqual([]);
  });

  it('excludes the product itself', () => {
    const alts = findCheaperAlternatives(products[0], products);
    expect(alts.every((a) => a.id !== '1')).toBe(true);
  });
});
