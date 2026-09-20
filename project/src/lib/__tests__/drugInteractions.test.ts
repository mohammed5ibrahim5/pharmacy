import { describe, it, expect } from 'vitest';
import { identifyProductGroups, checkCartInteractions } from '@/lib/drugInteractions';
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

describe('identifyProductGroups', () => {
  it('identifies paracetamol by English name', () => {
    const p = makeProduct({ id: '1', name: 'Panadol', name_en: 'Panadol' });
    expect(identifyProductGroups(p)).toContain('paracetamol');
  });

  it('identifies paracetamol by Arabic name', () => {
    const p = makeProduct({ id: '1', name: 'بانادول' });
    expect(identifyProductGroups(p)).toContain('paracetamol');
  });

  it('identifies NSAID by English name', () => {
    const p = makeProduct({ id: '1', name: 'Ibuprofen', name_en: 'Ibuprofen' });
    expect(identifyProductGroups(p)).toContain('nsaid');
  });

  it('identifies NSAID by Arabic name', () => {
    const p = makeProduct({ id: '1', name: 'إيبوبروفين' });
    expect(identifyProductGroups(p)).toContain('nsaid');
  });

  it('identifies anticoagulant (aspirin)', () => {
    const p = makeProduct({ id: '1', name: 'Aspirin', name_en: 'Aspirin' });
    expect(identifyProductGroups(p)).toContain('anticoagulant');
  });

  it('identifies nitrate', () => {
    const p = makeProduct({ id: '1', name: 'Nitroglycerin', name_en: 'Nitroglycerin' });
    expect(identifyProductGroups(p)).toContain('nitrate');
  });

  it('identifies PDE5 inhibitor', () => {
    const p = makeProduct({ id: '1', name: 'Sildenafil', name_en: 'Sildenafil' });
    expect(identifyProductGroups(p)).toContain('pde5_inhibitor');
  });

  it('identifies antibiotic', () => {
    const p = makeProduct({ id: '1', name: 'Ciprofloxacin', name_en: 'Ciprofloxacin' });
    expect(identifyProductGroups(p)).toContain('chelating_antibiotic');
  });

  it('identifies thyroid hormone', () => {
    const p = makeProduct({ id: '1', name: 'Levothyroxine', name_en: 'Levothyroxine' });
    expect(identifyProductGroups(p)).toContain('thyroid');
  });

  it('identifies sedating antihistamine', () => {
    const p = makeProduct({ id: '1', name: 'Chlorpheniramine', name_en: 'Chlorpheniramine' });
    expect(identifyProductGroups(p)).toContain('sedating_antihistamine');
  });

  it('returns empty for unknown product', () => {
    const p = makeProduct({ id: '1', name: 'Vitamin C' });
    expect(identifyProductGroups(p)).toEqual([]);
  });
});

describe('checkCartInteractions', () => {
  it('returns empty for less than 2 products', () => {
    expect(checkCartInteractions([])).toEqual([]);
    expect(checkCartInteractions([
      makeProduct({ id: '1', name: 'Panadol', name_en: 'Panadol' }),
    ])).toEqual([]);
  });

  it('detects paracetamol duplication (warning)', () => {
    const products = [
      makeProduct({ id: '1', name: 'Panadol', name_en: 'Panadol' }),
      makeProduct({ id: '2', name: 'Panadol Extra', name_en: 'Panadol Extra' }),
    ];
    const alerts = checkCartInteractions(products);
    expect(alerts.some((a) => a.id.includes('paracetamol_dup'))).toBe(true);
    expect(alerts.find((a) => a.id.includes('paracetamol_dup'))!.severity).toBe('warning');
  });

  it('detects NSAID + anticoagulant danger', () => {
    const products = [
      makeProduct({ id: '1', name: 'Ibuprofen', name_en: 'Ibuprofen' }),
      makeProduct({ id: '2', name: 'Aspirin', name_en: 'Aspirin' }),
    ];
    const alerts = checkCartInteractions(products);
    expect(alerts.some((a) => a.id.includes('nsaid_anticoagulant'))).toBe(true);
    expect(alerts.find((a) => a.id.includes('nsaid_anticoagulant'))!.severity).toBe('danger');
  });

  it('detects nitrate + PDE5 danger', () => {
    const products = [
      makeProduct({ id: '1', name: 'Nitroglycerin', name_en: 'Nitroglycerin' }),
      makeProduct({ id: '2', name: 'Sildenafil', name_en: 'Sildenafil' }),
    ];
    const alerts = checkCartInteractions(products);
    expect(alerts.some((a) => a.id.includes('pde5_nitrate'))).toBe(true);
    expect(alerts.find((a) => a.id.includes('pde5_nitrate'))!.severity).toBe('danger');
  });

  it('detects duplicate NSAIDs (warning)', () => {
    const products = [
      makeProduct({ id: '1', name: 'Ibuprofen', name_en: 'Ibuprofen' }),
      makeProduct({ id: '2', name: 'Diclofenac', name_en: 'Diclofenac' }),
    ];
    const alerts = checkCartInteractions(products);
    expect(alerts.some((a) => a.id.includes('nsaid_dup'))).toBe(true);
    expect(alerts.find((a) => a.id.includes('nsaid_dup'))!.severity).toBe('warning');
  });

  it('detects antacid + antibiotic caution', () => {
    const products = [
      makeProduct({ id: '1', name: 'Maalox', name_en: 'Maalox' }),
      makeProduct({ id: '2', name: 'Ciprofloxacin', name_en: 'Ciprofloxacin' }),
    ];
    const alerts = checkCartInteractions(products);
    expect(alerts.some((a) => a.id.includes('antacid_chelation'))).toBe(true);
    expect(alerts.find((a) => a.id.includes('antacid_chelation'))!.severity).toBe('caution');
  });

  it('detects antacid + thyroid caution', () => {
    const products = [
      makeProduct({ id: '1', name: 'Calcium supplement', active_ingredient: 'Calcium', name_en: 'Calcium' }),
      makeProduct({ id: '2', name: 'Levothyroxine', name_en: 'Levothyroxine' }),
    ];
    const alerts = checkCartInteractions(products);
    expect(alerts.some((a) => a.id.includes('antacid_chelation'))).toBe(true);
  });

  it('detects duplicate sedating antihistamines (caution)', () => {
    const products = [
      makeProduct({ id: '1', name: 'Chlorpheniramine', name_en: 'Chlorpheniramine' }),
      makeProduct({ id: '2', name: 'Diphenhydramine', name_en: 'Diphenhydramine' }),
    ];
    const alerts = checkCartInteractions(products);
    expect(alerts.some((a) => a.id.includes('sedation'))).toBe(true);
    expect(alerts.find((a) => a.id.includes('sedation'))!.severity).toBe('caution');
  });

  it('returns no alerts for safe combinations', () => {
    const products = [
      makeProduct({ id: '1', name: 'Panadol', name_en: 'Panadol' }),
      makeProduct({ id: '2', name: 'Vitamin C' }),
    ];
    const alerts = checkCartInteractions(products);
    expect(alerts).toEqual([]);
  });

  it('does not duplicate checks for same pair', () => {
    const products = [
      makeProduct({ id: '1', name: 'Ibuprofen', name_en: 'Ibuprofen' }),
      makeProduct({ id: '2', name: 'Aspirin', name_en: 'Aspirin' }),
    ];
    const alerts = checkCartInteractions(products);
    const nsaidAnticoagulant = alerts.filter((a) => a.id.includes('nsaid_anticoagulant'));
    expect(nsaidAnticoagulant.length).toBe(1);
  });

  it('handles 3+ products and checks all pairs', () => {
    const products = [
      makeProduct({ id: '1', name: 'Panadol', name_en: 'Panadol' }),
      makeProduct({ id: '2', name: 'Panadol Extra', name_en: 'Panadol Extra' }),
      makeProduct({ id: '3', name: 'Ibuprofen', name_en: 'Ibuprofen' }),
    ];
    const alerts = checkCartInteractions(products);
    // Panadol + Panadol Extra → paracetamol_dup (1 alert)
    // Ibuprofen doesn't interact with paracetamol, so only 1 alert total
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts.some((a) => a.id.includes('paracetamol_dup'))).toBe(true);
  });
});
