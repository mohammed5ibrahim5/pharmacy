import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { CATEGORY_ICON_MAP, categoryColor, categoryIcon } from '@/lib/categoryStyles';
import { Field, Modal, inputClass } from './shared';
import type { Category } from '@/types';

export function CategoriesTab() {
  const { settings } = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true, nullsFirst: false });
    if (error || !data) {
      const { data: fallback } = await supabase.from('categories').select('*').order('name');
      setCategories((fallback || []) as Category[]);
    } else {
      setCategories((data || []) as Category[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm text-gray-500">إدارة فئات الأدوية والمنتجات</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: settings.primary_color }}><Plus className="w-4 h-4" /> إضافة فئة</button>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const CatIcon = categoryIcon(cat.slug, cat.icon);
            const color = categoryColor(cat.slug);
            return (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-100 p-4 text-center group">
                <div className="flex justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(cat); setShowForm(true); }} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center"><Edit2 className="w-3.5 h-3.5 text-gray-600" /></button>
                  <button onClick={() => handleDelete(cat.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${color}18`, color }}><CatIcon className="w-6 h-6" /></div>
                <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                {cat.name_en && <p className="text-xs text-gray-400 mt-0.5">{cat.name_en}</p>}
              </div>
            );
          })}
        </div>
      )}
      {showForm && <CategoryForm category={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchCategories(); setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function CategoryForm({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({ name: category?.name || '', name_en: category?.name_en || '', slug: category?.slug || '', icon: category?.icon || '', sort_order: category?.sort_order?.toString() || '' });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    const slug = form.slug || form.name_en?.toLowerCase().replace(/\s+/g, '-') || form.name.trim().replace(/\s+/g, '-');
    const payload = { ...form, slug, sort_order: form.sort_order.trim() ? Number(form.sort_order.trim()) : null };
    if (category) { await supabase.from('categories').update(payload).eq('id', category.id); } else { await supabase.from('categories').insert(payload); }
    setSaving(false); onSaved();
  };
  return (
    <Modal onClose={onClose} title={category ? 'تعديل فئة' : 'إضافة فئة جديدة'}>
      <div className="space-y-4">
        <Field label="الاسم بالعربية *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
        <Field label="الاسم بالإنجليزية"><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className={inputClass} dir="ltr" /></Field>
        <Field label="المعرف (slug)"><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass} dir="ltr" placeholder="auto-generated if empty" /></Field>
        <Field label="الأيقونة">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border" style={{ backgroundColor: `${categoryColor(form.slug)}18`, color: categoryColor(form.slug), borderColor: `${categoryColor(form.slug)}30` }}>
              {(() => { const IconPreview = categoryIcon(form.slug, form.icon); return <IconPreview className="w-5 h-5" />; })()}
            </div>
            <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputClass}>
              <option value="">تلقائي (حسب الفئة)</option>
              {Object.keys(CATEGORY_ICON_MAP).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="ترتيب الظهور (رقم صغير = الأول)"><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputClass} dir="ltr" placeholder="اختياري" /></Field>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.name} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}
