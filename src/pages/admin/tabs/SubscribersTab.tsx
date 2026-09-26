import { useState, useEffect, useCallback } from 'react';
import { Inbox, Mail, Trash2, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useToast, ConfirmModal } from './shared';
import type { NewsletterSubscriber } from '@/types';

export function SubscribersTab() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [list, setList] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    setList((data || []) as NewsletterSubscriber[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
    if (error) { toast('حدث خطأ أثناء الحذف', 'error'); return; }
    toast('تم الحذف بنجاح');
    fetchSubs();
  };

  const handleExport = () => {
    const emails = list.map((s) => s.email).join('\n');
    navigator.clipboard?.writeText(emails);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-sm text-gray-500">إجمالي المشتركين: {list.length}</h2>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50">
          <Copy className="w-3.5 h-3.5" /> نسخ جميع الإيميلات
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><Inbox className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-gray-500">لا يوجد مشتركون بعد — المشتركون من صندوق النشرة في التذييل سيظهرون هنا</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {list.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-3 p-3.5 ${i !== 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${settings.primary_color}15` }}>
                <Mail className="w-4 h-4" style={{ color: settings.primary_color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate" dir="ltr">{s.email}</p>
                <p className="text-[11px] text-gray-400">اشترك في {new Date(s.created_at).toLocaleDateString('ar-EG')}</p>
              </div>
              <button onClick={() => setDeleteTarget(s.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); setDeleteTarget(null); }} title="حذف المشترك" message="هل أنت متأكد من حذف هذا المشترك؟" danger confirmLabel="حذف" />
    </div>
  );
}
