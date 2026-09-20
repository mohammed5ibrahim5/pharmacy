import { useState, useEffect, useCallback } from 'react';
import { MessageSquareQuote, Plus, Trash2, Eye, EyeOff, Star, ChevronUp, ChevronDown, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useToast, ConfirmModal } from './shared';
import type { Pharmacy, Review } from '@/types';

export function ReviewsTab() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [list, setList] = useState<Review[]>([]);
  const [pharmacies, setPharmacies] = useState<Pick<Pharmacy, 'id' | 'name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ pharmacy_id: '', customer_name: '', rating: 5, comment: '', is_visible: true });

  const showToast = (msg: string) => { toast(msg); };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reviews')
      .select('*, pharmacy:pharmacies(name, is_active)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setList((data || []) as Review[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReviews();
    supabase
      .from('pharmacies')
      .select('id, name')
      .order('name', { ascending: true })
      .then(({ data }) => {
        const pharms = (data || []) as Pick<Pharmacy, 'id' | 'name'>[];
        setPharmacies(pharms);
        setForm((f) => ({ ...f, pharmacy_id: f.pharmacy_id || pharms[0]?.id || '' }));
      });
  }, [fetchReviews]);

  const toggleVisible = async (r: Review) => {
    if (togglingId) return;
    setTogglingId(r.id);
    const next = !r.is_visible;
    setList((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_visible: next } : x)));
    const { error } = await supabase.from('reviews').update({ is_visible: next }).eq('id', r.id);
    setTogglingId(null);
    if (error) {
      setList((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_visible: r.is_visible } : x)));
      showToast(
        String(error.message).includes('is_visible')
          ? 'عمود is_visible غير موجود — شغّل ملف 20260811000000_reviews_management.sql في Supabase SQL Editor أولاً'
          : `فشل التحديث: ${error.message}`
      );
      return;
    }
    showToast(next ? 'تم إظهار التقييم في المتجر' : 'تم إخفاء التقييم من المتجر');
    fetchReviews();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) { toast('حدث خطأ أثناء الحذف', 'error'); return; }
    showToast('تم حذف التقييم');
    fetchReviews();
  };

  const move = async (r: Review, dir: number) => {
    const idx = list.findIndex((x) => x.id === r.id);
    const target = list[idx + dir];
    if (!target) return;
    await Promise.all([
      supabase.from('reviews').update({ sort_order: target.sort_order ?? 0 }).eq('id', r.id),
      supabase.from('reviews').update({ sort_order: r.sort_order ?? 0 }).eq('id', target.id),
    ]);
    fetchReviews();
  };

  const handleAdd = async () => {
    if (!form.pharmacy_id) return;
    setSaving(true);
    const { data } = await supabase
      .from('reviews')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = (data && data.length > 0 ? (data[0].sort_order ?? 0) : -1) + 1;
    await supabase.from('reviews').insert({
      pharmacy_id: form.pharmacy_id,
      customer_name: form.customer_name.trim() || 'عميل',
      rating: form.rating,
      comment: form.comment.trim() || null,
      is_visible: form.is_visible,
      sort_order: nextOrder,
    });
    setSaving(false);
    setShowForm(false);
    setForm((f) => ({ ...f, customer_name: '', comment: '', rating: 5, is_visible: true }));
    showToast('تم إضافة التقييم');
    fetchReviews();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-sm text-gray-500">إدارة تقييمات العملاء — إظهار/إخفاء وترتيب يظهر كما هو في المتجر</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium"
          style={{ backgroundColor: settings.primary_color }}
        >
          <Plus className="w-4 h-4" /> إضافة تقييم
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <MessageSquareQuote className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">لا توجد تقييمات حتى الآن</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((r, i) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <button onClick={() => move(r, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center disabled:opacity-25 disabled:hover:bg-transparent" title="تحريك لأعلى">
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => move(r, 1)} disabled={i === list.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center disabled:opacity-25 disabled:hover:bg-transparent" title="تحريك لأسفل">
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0" style={{ backgroundColor: settings.primary_color }}>
                  {(r.customer_name || '؟').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-800">{r.customer_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{r.pharmacy?.name || 'صيدلية'}</span>
                    {r.customer_id && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">من متجر</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                    <span className="text-[11px] text-gray-400 mr-1">{new Date(r.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                  {r.comment && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.comment}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleVisible(r)}
                    disabled={togglingId === r.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-60 ${r.is_visible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {togglingId === r.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : r.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {r.is_visible ? 'ظاهر' : 'مخفي'}
                  </button>
                  <button onClick={() => setDeleteTarget(r.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center" title="حذف">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-gray-800">إضافة تقييم جديد</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">الصيدلية</label>
                <select
                  value={form.pharmacy_id}
                  onChange={(e) => setForm({ ...form, pharmacy_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="" disabled>اختر الصيدلية</option>
                  {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">اسم العميل</label>
                <input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="مثال: أحمد محمد"
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">التقييم</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, rating: s })} className="transition-transform hover:scale-125">
                      <Star className={`w-6 h-6 ${s <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">التعليق</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  rows={3}
                  placeholder="اكتب نص التقييم (اختياري)..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-sm font-bold text-gray-700">ظاهر للعملاء في المتجر</span>
              </label>
              <button
                onClick={handleAdd}
                disabled={saving || !form.pharmacy_id}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: settings.primary_color }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'جاري الحفظ...' : 'حفظ التقييم'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); setDeleteTarget(null); }} title="حذف التقييم" message="هل أنت متأكد من حذف هذا التقييم نهائياً؟ لا يمكن التراجع عن هذا الإجراء." danger confirmLabel="حذف" />
    </div>
  );
}
