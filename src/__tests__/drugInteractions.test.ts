import { describe, it, expect } from 'vitest';
import { identifyProductGroups, checkCartInteractions } from '@/lib/drugInteractions';
import type { Product } from '@/types';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'test-1',
    name: 'Test Drug',
    name_en: null,
    description: null,
    active_ingredient: null,
    price: 10,
    image_url: null,
    category_id: null,
    pharmacy_id: 'ph-1',
    is_available: true,
    requires_prescription: false,
    ...overrides,
  } as Product;
}

describe('identifyProductGroups', () => {
  it('identifies paracetamol by name', () => {
    const p = makeProduct({ name: 'باراسيتامول 500 مجم' });
    expect(identifyProductGroups(p)).toContain('paracetamol');
  });

  it('identifies paracetamol by English name', () => {
    const p = makeProduct({ name: 'Panadol Extra' });
    expect(identifyProductGroups(p)).toContain('paracetamol');
  });

  it('identifies NSAID by active ingredient', () => {
    const p = makeProduct({ active_ingredient: 'Ibuprofen 400mg' });
    expect(identifyProductGroups(p)).toContain('nsaid');
  });

  it('identifies anticoagulant', () => {
    const p = makeProduct({ name: 'Aspirin 81mg' });
    expect(identifyProductGroups(p)).toContain('anticoagulant');
  });

  it('returns empty array for unknown drug', () => {
    const p = makeProduct({ name: 'Unknown Drug XYZ' });
    expect(identifyProductGroups(p)).toEqual([]);
  });

  it('identifies multiple groups', () => {
    const p = makeProduct({ name: 'كونجستال' });
    const groups = identifyProductGroups(p);
    expect(groups).toContain('paracetamol');
  });
});

describe('checkCartInteractions', () => {
  it('returns empty for single product', () => {
    const p = makeProduct({ name: 'Paracetamol' });
    expect(checkCartInteractions([p])).toEqual([]);
  });

  it('returns empty for empty cart', () => {
    expect(checkCartInteractions([])).toEqual([]);
  });

  it('detects duplicate paracetamol warning', () => {
    const p1 = makeProduct({ id: 'p1', name: 'Paracetamol 500mg' });
    const p2 = makeProduct({ id: 'p2', name: 'Panadol Extra' });
    const alerts = checkCartInteractions([p1, p2]);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some(a => a.severity === 'warning')).toBe(true);
  });

  it('detects NSAID + anticoagulant danger', () => {
    const p1 = makeProduct({ id: 'p1', name: 'Ibuprofen 400mg' });
    const p2 = makeProduct({ id: 'p2', name: 'Aspirin 81mg' });
    const alerts = checkCartInteractions([p1, p2]);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some(a => a.severity === 'danger')).toBe(true);
  });

  it('returns empty for non-interacting drugs', () => {
    const p1 = makeProduct({ id: 'p1', name: 'Vitamin C' });
    const p2 = makeProduct({ id: 'p2', name: 'Omega 3' });
    expect(checkCartInteractions([p1, p2])).toEqual([]);
  });
});
