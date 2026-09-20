import { useEffect, useState } from 'react';
import { BarChart3, Loader2, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Report { orders: number; delivered: number; revenue: number; top_products: Array<{ name: string; quantity: number; revenue: number }> }

export function PharmacyReportsTab() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.rpc('get_pharmacy_sales_report', {}).then(({ data }) => { setReport(data as Report | null); setLoading(false); }); }, []);
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div>;
  if (!report) return <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-500">تعذر تحميل التقارير.</div>;
  return <div className="space-y-5">
    <div className="flex items-center gap-2 border-b border-slate-200 pb-3"><BarChart3 className="h-5 w-5 text-teal-600" /><h2 className="text-xl font-black text-slate-900">تقارير الصيدلية</h2><span className="text-xs font-bold text-slate-400">آخر 30 يوماً</span></div>
    <div className="grid gap-4 sm:grid-cols-3"><Metric icon={<ShoppingCart />} label="الطلبات" value={report.orders} /><Metric icon={<Package />} label="تم التسليم" value={report.delivered} /><Metric icon={<TrendingUp />} label="الإيراد" value={`${Number(report.revenue || 0).toFixed(2)} ج.م`} /></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="mb-4 text-sm font-black text-slate-900">أفضل المنتجات</h3><div className="space-y-2">{(report.top_products || []).map((product, index) => <div key={`${product.name}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs"><span className="font-black text-slate-800">{index + 1}. {product.name}</span><span className="font-bold text-slate-500">{product.quantity} وحدة · {Number(product.revenue || 0).toFixed(2)} ج.م</span></div>)}</div></div>
  </div>;
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">{icon}</div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div>; }
