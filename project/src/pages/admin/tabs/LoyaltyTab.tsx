import { useState, useEffect, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';

type LoyaltyTxRow = {
  id: string;
  points: number;
  reason: string;
  created_at: string;
  customer: { full_name?: string | null; phone?: string | null; email?: string | null };
};

export function LoyaltyTab() {
  const { settings } = useSettings();
  const [history, setHistory] = useState<LoyaltyTxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'spent'>('all');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('loyalty_transactions')
      .select('*, customer:customers(full_name, phone, email)')
      .order('created_at', { ascending: false })
      .limit(100);
    setHistory((data || []) as LoyaltyTxRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filtered = history.filter((h) => {
    if (filter === 'earned') return h.points > 0;
    if (filter === 'spent') return h.points < 0;
    return true;
  });

  const totalEarned = history.filter((h) => h.points > 0).reduce((s, h) => s + h.points, 0);
  const totalSpent = history.filter((h) => h.points < 0).reduce((s, h) => s + h.points, 0);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">إجمالي النقاط المكتسبة</p>
          <p className="text-2xl font-black" style={{ color: settings.accent_color }}>{totalEarned}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">النقاط المستهلكة</p>
          <p className="text-2xl font-black text-red-500">{totalSpent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">عدد العمليات</p>
          <p className="text-2xl font-black text-gray-900">{history.length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {(['all', 'earned', 'spent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              filter === f ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            style={filter === f ? { backgroundColor: settings.primary_color } : {}}
          >
            {f === 'all' ? 'الكل' : f === 'earned' ? 'مكتسبة' : 'مستهلكة'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Sparkles className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">لا توجد حركات نقاط بعد — النقاط تُمنح تلقائياً مع كل طلب ناجح</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {filtered.map((tx, i) => (
            <div key={tx.id} className={`flex items-center gap-3 p-3.5 ${i !== 0 ? 'border-t border-gray-50' : ''} flex-wrap`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${tx.points > 0 ? settings.accent_color : '#ef4444'}15` }}>
                <Sparkles className="w-4 h-4" style={{ color: tx.points > 0 ? settings.accent_color : '#ef4444' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{tx.reason}</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {tx.customer?.full_name || 'عميل'} • {tx.customer?.phone || tx.customer?.email || 'بدون بيانات'} • {new Date(tx.created_at).toLocaleDateString('ar-EG')}
                </p>
              </div>
              <span className={`text-sm font-black ${tx.points > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                {tx.points > 0 ? `+${tx.points}` : tx.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
