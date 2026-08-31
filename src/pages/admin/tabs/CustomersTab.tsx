import { useState, useEffect } from 'react';
import { Users, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { inputClass } from './shared';

interface CustomerRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
  ordersCount: number;
  totalSpent: number;
}

interface CustomerProfileLike {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
}

export function CustomersTab() {
  const { settings } = useSettings();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: customers } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      const { data: orders } = await supabase.from('orders').select('customer_id, total_price, status');
      const byCustomer: Record<string, { count: number; total: number }> = {};
      (orders || []).forEach((o) => {
        if (!byCustomer[o.customer_id]) byCustomer[o.customer_id] = { count: 0, total: 0 };
        byCustomer[o.customer_id].count += 1;
        if (o.status !== 'cancelled') byCustomer[o.customer_id].total += (o.total_price || 0);
      });
      setRows(((customers || []) as CustomerProfileLike[]).map((c) => ({
        id: c.id,
        full_name: c.full_name,
        phone: c.phone,
        email: c.email,
        created_at: c.created_at,
        ordersCount: byCustomer[c.id]?.count || 0,
        totalSpent: byCustomer[c.id]?.total || 0,
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = rows.filter((r) =>
    !search ||
    (r.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا العميل نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    await supabase.from('customers').delete().eq('id', id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-sm text-gray-500">إجمالي العملاء: {rows.length}</h2>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد أو الهاتف..." className={`${inputClass} pr-9`} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><Users className="w-12 h-12 mx-auto text-gray-200 mb-3" /><p className="text-gray-500">{search ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد'}</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-right text-xs text-gray-400">
                <th className="p-3 font-medium">العميل</th>
                <th className="p-3 font-medium">الهاتف</th>
                <th className="p-3 font-medium">البريد</th>
                <th className="p-3 font-medium">الطلبات</th>
                <th className="p-3 font-medium">إجمالي المشتريات</th>
                <th className="p-3 font-medium">تاريخ التسجيل</th>
                <th className="p-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: settings.primary_color }}>
                        {(r.full_name || r.email || '؟').charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">{r.full_name || 'بدون اسم'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600" dir="ltr">{r.phone || '-'}</td>
                  <td className="p-3 text-gray-600" dir="ltr">{r.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">{r.ordersCount}</span>
                  </td>
                  <td className="p-3 font-bold" style={{ color: settings.primary_color }}>{r.totalSpent.toFixed(0)} ج.م</td>
                  <td className="p-3 text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="حذف العميل"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
