import { useState, useEffect, useCallback } from 'react';
import { BellRing, Trash2, Loader2, Pill } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { notifyStockAvailable } from '@/lib/loyalty';

type StockAlertRow = {
  id: string;
  created_at: string;
  product: { id: string; name: string; image_url?: string | null; is_available: boolean; unit?: string | null };
  customer: { full_name?: string | null; phone?: string | null; email?: string | null };
};

export function StockAlertsTab() {
  const { settings } = useSettings();
  const [list, setList] = useState<StockAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stock_alerts')
      .select('*, product:products(id, name, image_url, is_available, unit), customer:customers(full_name, phone, email)')
      .order('created_at', { ascending: false })
      .limit(200);
    setList((data || []) as StockAlertRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleNotify = async (alert: StockAlertRow) => {
    if (!confirm(`إرسال إشعار "الدواء أصبح متوفراً" لهذا العميل الآن وحذف طلبه؟`)) return;
    setNotifyingId(alert.id);
    const { error } = await supabase.from('products').update({ is_available: true }).eq('id', alert.product.id);
    if (!error) {
      await notifyStockAvailable(alert.product.id);
      showToast('تم إرسال الإشعار وإعادة تفعيل المنتج');
    }
    setNotifyingId(null);
    fetchAlerts();
  };

  const handleDeleteAll = async () => {
    if (!confirm('حذف جميع طلبات تنبيه التوفر؟')) return;
    await supabase.from('stock_alerts').delete().neq('id', '');
    fetchAlerts();
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-sm text-gray-500">طلبات "نبهني عند التوفر": {list.length}</h2>
        {list.length > 0 && (
          <button onClick={handleDeleteAll} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-xs font-bold text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> حذف الكل
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <BellRing className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">لا توجد طلبات تنبيه حالياً — عندما يطلب العميل التنبيه على منتج غير متوفر سيظهر هنا</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {list.map((alert, i) => {
            const productAvailable = alert.product?.is_available;
            return (
              <div key={alert.id} className={`flex items-center gap-3 p-3.5 ${i !== 0 ? 'border-t border-gray-50' : ''} flex-wrap`}>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  {alert.product?.image_url ? (
                    <img src={alert.product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Pill className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{alert.product?.name || 'منتج محذوف'}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {alert.customer?.full_name || 'عميل'} • {alert.customer?.phone || alert.customer?.email || 'بدون بيانات'}
                  </p>
                  <p className="text-[10px] text-gray-300">طلب في {new Date(alert.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${productAvailable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {productAvailable ? 'متوفر' : 'غير متوفر'}
                  </span>
                  {!productAvailable && (
                    <button
                      onClick={() => handleNotify(alert)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all"
                      style={{ backgroundColor: settings.primary_color }}
                    >
                      {notifyingId === alert.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                      فعّله وأشعره
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
