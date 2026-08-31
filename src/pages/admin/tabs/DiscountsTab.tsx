import { useState, useEffect, useCallback } from 'react';
import { TrendingDown, Plus, Edit2, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { Field, Modal, inputClass } from './shared';
import type { Pharmacy, Product, Discount } from '@/types';

export function DiscountsTab() {
  const { settings } = useSettings();
  const [discounts, setDiscounts] = useState<(Discount & { product?: Product; pharmacy?: Pharmacy })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('discounts').select('*, product:products(*), pharmacy:pharmacies(*)').order('created_at', { ascending: false });
    setDiscounts((data || []) as (Discount & { product?: Product; pharmacy?: Pharmacy })[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDiscounts();
    supabase.from('products').select('*, pharmacy:pharmacies(*)').order('name').then(({ data }) => setProducts((data || []) as Product[]));
    supabase.from('pharmacies').select('*').order('name').then(({ data }) => setPharmacies((data || []) as Pharmacy[]));
  }, [fetchDiscounts]);

  const handleDelete = async (id: string) => { if (!confirm('حذف هذا الخصم؟')) return; await supabase.from('discounts').delete().eq('id', id); fetchDiscounts(); };
  const toggleActive = async (d: Discount) => { await supabase.from('discounts').update({ is_active: !d.is_active }).eq('id', d.id); fetchDiscounts(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm text-gray-500">إدارة الخصومات والعروض</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: settings.primary_color }}><Plus className="w-4 h-4" /> إضافة خصم</button>
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : discounts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><TrendingDown className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-gray-500">لا توجد خصومات حالياً</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.accent_color}15` }}><TrendingDown className="w-5 h-5" style={{ color: settings.accent_color }} /></div>
                  <div><p className="font-bold text-lg" style={{ color: settings.accent_color }}>{d.discount_percentage}%</p><p className="text-xs text-gray-400">خصم</p></div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{d.is_active ? 'نشط' : 'متوقف'}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{d.product?.name}</p>
              <p className="text-xs text-gray-500">{d.pharmacy?.name}</p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                <button onClick={() => { setEditing(d); setShowForm(true); }} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 flex items-center justify-center gap-1"><Edit2 className="w-3 h-3" /> تعديل</button>
                <button onClick={() => toggleActive(d)} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 flex items-center justify-center gap-1">{d.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{d.is_active ? 'إيقاف' : 'تفعيل'}</button>
                <button onClick={() => handleDelete(d.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <DiscountForm discount={editing} products={products} pharmacies={pharmacies} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchDiscounts(); setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function DiscountForm({ discount, products, pharmacies, onClose, onSaved }: { discount: Discount | null; products: Product[]; pharmacies: Pharmacy[]; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({ product_id: discount?.product_id || '', pharmacy_id: discount?.pharmacy_id || '', discount_percentage: discount?.discount_percentage?.toString() || '10', is_active: discount?.is_active ?? true });
  const [saving, setSaving] = useState(false);
  const filteredProducts = products.filter((p) => !form.pharmacy_id || p.pharmacy_id === form.pharmacy_id);
  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, discount_percentage: parseFloat(form.discount_percentage) || 0 };
    if (discount) { await supabase.from('discounts').update(payload).eq('id', discount.id); } else { await supabase.from('discounts').insert(payload); }
    setSaving(false); onSaved();
  };
  return (
    <Modal onClose={onClose} title={discount ? 'تعديل خصم' : 'إضافة خصم جديد'}>
      <div className="space-y-4">
        <Field label="الصيدلية *"><select value={form.pharmacy_id} onChange={(e) => setForm({ ...form, pharmacy_id: e.target.value, product_id: '' })} className={inputClass}><option value="">اختر صيدلية</option>{pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="المنتج *"><select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className={inputClass} disabled={!form.pharmacy_id}><option value="">{form.pharmacy_id ? 'اختر منتج' : 'اختر صيدلية أولاً'}</option>{filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name} - {p.price} ج.م</option>)}</select></Field>
        <Field label="نسبة الخصم % *"><input value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} className={inputClass} dir="ltr" type="number" min="1" max="100" /></Field>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">خصم نشط</span></label>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.product_id || !form.pharmacy_id} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}
