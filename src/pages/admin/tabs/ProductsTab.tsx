import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Edit2, Trash2, Search, Save, Check, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { translateError } from '@/lib/errorMessages';
import { notifyStockAvailable } from '@/lib/loyalty';
import { Field, Modal, ImageUrlField, inputClass } from './shared';
import type { Pharmacy, Product, Category } from '@/types';

const UNIT_OPTIONS = ['قطعة', 'شريط', 'علبة', 'زجاجة', 'أمبول', 'تيوب', 'كيس', 'قارورة', 'عبوة', 'فيال'];

export function ProductsTab({ pharmacyId }: { pharmacyId?: string }) {
  const { settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPharmacy, setFilterPharmacy] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('products').select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)').order('name');
    if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId);
    const { data } = await query;
    setProducts((data || []) as Product[]);
    setLoading(false);
  }, [pharmacyId]);

  useEffect(() => {
    fetchProducts();
    if (!pharmacyId) {
      supabase.from('pharmacies').select('*').order('name').then(({ data }) => setPharmacies((data || []) as Pharmacy[]));
    }
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories((data || []) as Category[]));
  }, [fetchProducts, pharmacyId]);

  const filtered = products.filter((p) => !filterPharmacy || p.pharmacy_id === filterPharmacy).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('فشل حذف المنتج: ' + ((translateError(error.message).ar) || error.message));
      return;
    }
    fetchProducts();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative w-full sm:max-w-xs">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث عن منتج..." className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: settings.primary_color }} />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          {!pharmacyId && (
            <select value={filterPharmacy} onChange={(e) => setFilterPharmacy(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: settings.primary_color }}>
              <option value="">كل الصيدليات</option>
              {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shrink-0" style={{ backgroundColor: settings.primary_color }}><Plus className="w-4 h-4" /> إضافة منتج</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs"><tr>
                <th className="text-right p-3 font-medium">المنتج</th>
                {!pharmacyId && <th className="text-right p-3 font-medium hidden sm:table-cell">الصيدلية</th>}
                <th className="text-right p-3 font-medium hidden md:table-cell">الفئة</th>
                <th className="text-right p-3 font-medium">السعر</th>
                <th className="text-right p-3 font-medium hidden sm:table-cell">المخزون</th>
                <th className="text-right p-3 font-medium hidden sm:table-cell">الحالة</th>
                <th className="text-center p-3 font-medium">إجراءات</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((product) => {
                  const discount = product.discounts?.find((d) => d.is_active);
                  const finalPrice = discount ? product.price * (1 - discount.discount_percentage / 100) : product.price;
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {product.image_url ? <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[160px]">{product.name}</p>
                            {product.active_ingredient && <p className="text-xs text-gray-400 truncate">{product.active_ingredient}</p>}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {product.requires_prescription && <span className="text-xs text-amber-600">يحتاج وصفة</span>}
                              {product.is_medical === false && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">بدون وظيفة طبية</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      {!pharmacyId && <td className="p-3 text-gray-600 hidden sm:table-cell">{product.pharmacy?.name}</td>}
                      <td className="p-3 text-gray-600 hidden md:table-cell">{product.category?.name || '-'}</td>
                      <td className="p-3"><span className="font-semibold" style={{ color: settings.primary_color }}>{finalPrice.toFixed(2)}</span>{discount && <span className="text-xs text-gray-400 line-through mr-1">{product.price.toFixed(2)}</span>}<span className="text-xs text-gray-400"> ج.م</span></td>
                      <td className="p-3 hidden sm:table-cell"><span className={`text-xs font-medium ${product.stock_quantity > 10 ? 'text-green-600' : product.stock_quantity > 0 ? 'text-amber-600' : 'text-red-500'}`}>{product.stock_quantity}</span></td>
                      <td className="p-3 hidden sm:table-cell"><span className={`px-2 py-0.5 rounded-full text-xs ${product.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{product.is_available ? 'متوفر' : 'غير متوفر'}</span></td>
                      <td className="p-3"><div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditing(product); setShowForm(true); }} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><Edit2 className="w-4 h-4 text-gray-600" /></button>
                        <button onClick={() => handleDelete(product.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <ProductForm product={editing} pharmacies={pharmacies} categories={categories} lockedPharmacy={pharmacyId ? { id: pharmacyId, name: '' } : undefined} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchProducts(); setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

export function ProductForm({ product, pharmacies, categories, onClose, onSaved, lockedPharmacy }: { product: Product | null; pharmacies: Pharmacy[]; categories: Category[]; onClose: () => void; onSaved: () => void; lockedPharmacy?: { id: string; name: string } }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    name: product?.name || '', name_en: product?.name_en || '', description: product?.description || '',
    price: product?.price?.toString() || '', unit: product?.unit || 'قطعة', image_url: product?.image_url || '',
    pharmacy_id: lockedPharmacy?.id || product?.pharmacy_id || pharmacies[0]?.id || '', category_id: product?.category_id || '',
    for_all_pharmacies: product?.for_all_pharmacies ?? false,
    is_available: product?.is_available ?? true, requires_prescription: product?.requires_prescription ?? false,
    is_medical: product?.is_medical ?? true,
    active_ingredient: product?.active_ingredient || '', manufacturer: product?.manufacturer || '',
    form_type: product?.form || '', dosage: product?.dosage || '',
    how_to_use: product?.how_to_use || '', contraindications: product?.contraindications || '',
    interactions: product?.interactions || '',
    stock_quantity: product?.stock_quantity?.toString() || '0', barcode: product?.barcode || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ownerPharmacyId = lockedPharmacy?.id || (form.for_all_pharmacies && !form.pharmacy_id ? pharmacies[0]?.id || '' : form.pharmacy_id);
    const payload = {
      name: form.name, name_en: form.name_en, description: form.description,
      price: parseFloat(form.price) || 0, unit: form.unit, image_url: form.image_url,
      pharmacy_id: ownerPharmacyId, category_id: form.category_id || null,
      for_all_pharmacies: form.for_all_pharmacies,
      is_available: form.is_available, requires_prescription: form.requires_prescription,
      is_medical: form.is_medical,
      active_ingredient: form.active_ingredient || null, manufacturer: form.manufacturer || null,
      form: form.form_type || null, dosage: form.dosage || null,
      how_to_use: form.how_to_use || null, contraindications: form.contraindications || null,
      interactions: form.interactions || null,
      stock_quantity: parseInt(form.stock_quantity) || 0, barcode: form.barcode || null,
      updated_at: new Date().toISOString(),
    };
    let saveErr: unknown = null;
    if (product) {
      const wasUnavailable = !product.is_available;
      const { error } = await supabase.from('products').update(payload).eq('id', product.id);
      saveErr = error;
      if (!error && wasUnavailable && payload.is_available) {
        await notifyStockAvailable(product.id);
      }
    }
    else {
      const { error } = await supabase.from('products').insert(payload);
      saveErr = error;
    }
    setSaving(false);
    if (saveErr) {
      const msg = (saveErr as { message?: string })?.message || '';
      alert('فشل حفظ المنتج: ' + (translateError(msg).ar || msg));
      return;
    }
    onSaved();
  };

  return (
    <Modal onClose={onClose} title={product ? 'تعديل منتج' : 'إضافة منتج جديد'} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم المنتج *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="اسم المنتج بالعربية" /></Field>
          <Field label="الاسم بالإنجليزية"><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Product name" /></Field>
        </div>
        <Field label="الوصف"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={2} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="السعر (ج.م) *"><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} dir="ltr" type="number" step="0.01" /></Field>
          <Field label="الوحدة">
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass} placeholder="شريط / علبة" list="unit-suggestions" />
            <datalist id="unit-suggestions">
              {UNIT_OPTIONS.map((u) => <option key={u} value={u} />)}
            </datalist>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {UNIT_OPTIONS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setForm({ ...form, unit: u })}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${form.unit === u ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  style={form.unit === u ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : { borderColor: '#e2e8f0' }}
                >
                  {u}
                </button>
              ))}
            </div>
          </Field>
          <Field label="الفئة"><select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputClass}><option value="">بدون فئة</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        </div>
        {!lockedPharmacy && (
          <div className="space-y-2">
            <Field label="الصيدلية">
              <select
                value={form.pharmacy_id}
                onChange={(e) => setForm({ ...form, pharmacy_id: e.target.value })}
                className={inputClass}
                disabled={form.for_all_pharmacies}
              >
                <option value="">اختر صيدلية</option>
                {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.for_all_pharmacies}
                onChange={(e) => setForm({ ...form, for_all_pharmacies: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">متاح في جميع الصيدليات</span>
            </label>
            {form.for_all_pharmacies && (
              <p className="text-[11px] font-bold text-teal-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> هذا المنتج سيظهر في كل صيدليات الموقع.
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="المادة الفعالة"><input value={form.active_ingredient} onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })} className={inputClass} placeholder="مثال: باراسيتامول" /></Field>
          <Field label="الشركة المنتجة"><input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className={inputClass} placeholder="مثال: GlaxoSmithKline" /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="الشكل الدوائي"><select value={form.form_type} onChange={(e) => setForm({ ...form, form_type: e.target.value })} className={inputClass}><option value="">اختر</option><option value="أقراص">أقراص</option><option value="كبسولات">كبسولات</option><option value="شراب">شراب</option><option value="كريم">كريم</option><option value="حقن">حقن</option><option value="أقراص فوارة">أقراص فوارة</option><option value="قطرات">قطرات</option><option value="بخاخ">بخاخ</option></select></Field>
          <Field label="الجرعة"><input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} className={inputClass} dir="ltr" placeholder="500mg" /></Field>
          <Field label="الكمية في المخزون"><input value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className={inputClass} dir="ltr" type="number" /></Field>
        </div>
        <Field label="الباركود"><input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className={inputClass} dir="ltr" placeholder="اختياري" /></Field>
        <Field label="طريقة الاستخدام (اختياري)"><textarea value={form.how_to_use} onChange={(e) => setForm({ ...form, how_to_use: e.target.value })} className={inputClass} rows={2} placeholder="مثال: قرص واحد بعد الأكل كل 8 ساعات" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="متى لا يُستخدم (موانع الاستخدام)"><textarea value={form.contraindications} onChange={(e) => setForm({ ...form, contraindications: e.target.value })} className={inputClass} rows={2} placeholder="مثال: لا يُستخدم لمرضى الكبد أو الحساسية من المادة الفعالة" /></Field>
          <Field label="التفاعلات الدوائية"><textarea value={form.interactions} onChange={(e) => setForm({ ...form, interactions: e.target.value })} className={inputClass} rows={2} placeholder="مثال: يتعارض مع مميعات الدم" /></Field>
        </div>
        <ImageUrlField label="رابط صورة المنتج" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
        <div className="flex gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">متوفر</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.requires_prescription} onChange={(e) => setForm({ ...form, requires_prescription: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">يحتاج وصفة طبية</span></label>
        </div>
        <Field label="نوع المنتج">
          <select value={form.is_medical ? 'medical' : 'non_medical'} onChange={(e) => setForm({ ...form, is_medical: e.target.value === 'medical' })} className={inputClass}>
            <option value="medical">منتج بوظيفة طبية</option>
            <option value="non_medical">منتج بدون وظيفة طبية</option>
          </select>
          {!form.is_medical && (
            <p className="mt-1.5 text-[11px] font-bold text-amber-600 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> ستظهر عبارة «بدون وظيفة طبية» على بطاقة المنتج ووصفه في المتجر.
            </p>
          )}
        </Field>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.name || (!form.for_all_pharmacies && !form.pharmacy_id) || !form.price} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}
