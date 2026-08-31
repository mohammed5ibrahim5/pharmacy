import { useState, useEffect, useCallback } from 'react';
import { Ticket, Plus, Edit2, Trash2, Eye, EyeOff, Copy, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { Field, Modal, inputClass } from './shared';
import type { Coupon } from '@/types';

export function CouponsTab() {
  const { settings } = useSettings();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons((data || []) as Coupon[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا الكود؟')) return;
    await supabase.from('coupons').delete().eq('id', id);
    showToast('تم حذف الكود');
    fetchCoupons();
  };

  const toggleActive = async (c: Coupon) => {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    fetchCoupons();
  };

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    showToast('تم نسخ الكود');
  };

  const isExpired = (c: Coupon) => !!c.expires_at && new Date(c.expires_at) < new Date();
  const reachedLimit = (c: Coupon) => !!c.usage_limit && c.used_count >= c.usage_limit;
  const unavailable = (c: Coupon) => !c.is_active || isExpired(c) || reachedLimit(c);

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm text-gray-500">إنشاء أكواد خصم يمكن للعملاء استخدامها عند الطلب</h2>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: settings.primary_color }}><Plus className="w-4 h-4" /> إضافة كود خصم</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><Ticket className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-gray-500">لا توجد أكواد خصم حالياً</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => {
            const expired = isExpired(c);
            const limitReached = reachedLimit(c);
            const off = unavailable(c);
            return (
              <div key={c.id} className={`bg-white rounded-xl border p-4 ${off ? 'border-gray-200 opacity-70' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.primary_color}15` }}>
                      <Ticket className="w-5 h-5" style={{ color: settings.primary_color }} />
                    </div>
                    <div>
                      <button onClick={() => handleCopy(c.code)} title="نسخ الكود" className="flex items-center gap-1.5 font-black text-lg tracking-wider" style={{ color: settings.primary_color }} dir="ltr">
                        {c.code}
                        <Copy className="w-3.5 h-3.5 opacity-50" />
                      </button>
                      <p className="text-xs text-gray-400">{c.discount_type === 'percent' ? `خصم ${c.value}%` : `خصم ${c.value} ج.م`}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${off ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                    {expired ? 'منتهي' : limitReached ? 'اكتمل الاستخدام' : !c.is_active ? 'متوقف' : 'نشط'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-gray-700">الحد الأدنى</p><p>{c.min_order > 0 ? `${c.min_order} ج.م` : 'بدون'}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-gray-700">الاستخدام</p><p dir="ltr">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-gray-700">أقصى خصم</p><p>{c.max_discount ? `${c.max_discount} ج.م` : 'بدون'}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-gray-700">ينتهي</p><p>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-EG') : 'لا ينتهي'}</p></div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 flex items-center justify-center gap-1"><Edit2 className="w-3 h-3" /> تعديل</button>
                  <button onClick={() => toggleActive(c)} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 flex items-center justify-center gap-1">{c.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{c.is_active ? 'إيقاف' : 'تفعيل'}</button>
                  <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showForm && <CouponForm coupon={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchCoupons(); setShowForm(false); setEditing(null); showToast(editing ? 'تم تحديث الكود' : 'تم إضافة الكود'); }} />}
    </div>
  );
}

function CouponForm({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    code: coupon?.code || '',
    discount_type: coupon?.discount_type || 'percent',
    value: coupon?.value?.toString() || '10',
    min_order: coupon?.min_order?.toString() || '0',
    max_discount: coupon?.max_discount?.toString() || '',
    usage_limit: coupon?.usage_limit?.toString() || '',
    expires_at: coupon?.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 10) : '',
    is_active: coupon?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.code.trim()) return;
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      value: parseFloat(form.value) || 0,
      min_order: parseFloat(form.min_order) || 0,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };
    if (coupon) { await supabase.from('coupons').update(payload).eq('id', coupon.id); } else { await supabase.from('coupons').insert(payload); }
    setSaving(false); onSaved();
  };

  return (
    <Modal onClose={onClose} title={coupon ? 'تعديل كود الخصم' : 'إضافة كود خصم جديد'}>
      <div className="space-y-4">
        <Field label="كود الخصم *"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} dir="ltr" placeholder="مثال: SAVE15" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نوع الخصم">
            <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })} className={inputClass}>
              <option value="percent">نسبة %</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </Field>
          <Field label={form.discount_type === 'percent' ? 'نسبة الخصم % *' : 'قيمة الخصم (ج.م) *'}>
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الحد الأدنى للطلب (ج.م)"><input value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" /></Field>
          <Field label="أقصى مبلغ للخصم (ج.م)"><input value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" placeholder="اختياري" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="حد الاستخدام"><input value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className={inputClass} dir="ltr" type="number" min="1" placeholder="اختياري" /></Field>
          <Field label="تاريخ الانتهاء"><input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={inputClass} dir="ltr" /></Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">الكود نشط</span></label>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.code.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}
